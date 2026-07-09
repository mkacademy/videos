import { useLayoutEffect, useRef, useState, useMemo } from "react";
import * as descendantsWrapper from "../styles/descendantsWrapper.module.css";
import { Entity } from "./useFormsBuilder";
import { MenuItemWithOverrides } from "../components/DisplayedTags/MenuTags/Screen";

export interface Constraints {
  At992: number;
  At1440: number;
  At1536: number;
  At1920: number;
}

export type ScreenBuilderTypes = string | Entity | MenuItemWithOverrides;

interface ContentItem {
  [key: string]: ScreenBuilderTypes;
}

interface PaginatorType {
  index: number;
  maxIndex: number;
  arrLen: number;
  screenIndex: number;
  chunkSize: number | null;
  pageChunksizes: number[] | null;
  getChunksizes(constraints: Constraints): number[];
  calPageIndex(prevScreenIndex: number, extra?: number): void;
  getChunks(prefixLen: number | undefined, arr: string[]): string[][];
  appender(
    tables: ContentItem[],
    prefixLen: number | undefined,
    keys: string[],
    index: number,
    adjuster: number
  ): ScreenBuilderTypes;
  reduceEvenChunks(
    keys_chunk: string[],
    tables: ContentItem[],
    keys: string[],
    outerIndex: number,
    prefixLen: number | undefined
  ): Record<string, ScreenBuilderTypes>;
  reduceUnEvenChunks(
    keys_chunks: string[][],
    keys_chunk: string[],
    tables: ContentItem[],
    keys: string[],
    outerIndex: number,
    prefixLen: number | undefined
  ): Record<string, ScreenBuilderTypes>;
}

const Paginator: PaginatorType = {
  index: 0,
  maxIndex: 0,
  arrLen: 0,
  screenIndex: 0,
  chunkSize: null,
  pageChunksizes: null,
  getChunksizes(constraints: Constraints): number[] {
    const a = [1, 1, 2, constraints.At992, constraints.At1440];
    return [...a, constraints.At1536, constraints.At1920];
  },
  calPageIndex(prevScreenIndex: number, extra: number = 0): void {
    const items = this.index * this.pageChunksizes![prevScreenIndex];
    const remainder = (extra + items) % this.pageChunksizes![this.screenIndex];
    const res = (extra + items) / this.pageChunksizes![this.screenIndex];
    this.index = remainder === 0 ? Math.floor(res) : Math.floor(res) + 1;
  },
  getChunks(prefixLen: number | undefined, arr: string[]): string[][] {
    this.arrLen = prefixLen ? arr.length - prefixLen : arr.length;
    const chunkSize = this.chunkSize!;
    const clone = Array(Math.ceil(this.arrLen / chunkSize)).fill(0);
    const remainder = this.arrLen % chunkSize;
    const chunks = clone.map((_, i) => {
      const I = i - 1;
      const t = I * chunkSize;
      const u = I * chunkSize + chunkSize;
      return i > 0
        ? arr.slice(t, u)
        : remainder === 0
          ? arr.slice(this.arrLen - chunkSize, this.arrLen)
          : remainder !== 0
            ? arr.slice(this.arrLen - remainder, this.arrLen)
            : [arr[i]];
    });
    chunks.push(chunks.shift()!);
    if (prefixLen)
      chunks.unshift(arr.slice(arr.length - prefixLen, arr.length));
    // console.log(JSON.stringify(chunks, null, 2), prefixLen);
    return chunks;
  },
  appender(
    tables: ContentItem[],
    prefixLen: number | undefined,
    keys: string[],
    index: number,
    adjuster: number
  ): ScreenBuilderTypes {
    if (prefixLen)
      return `${tables[index][keys[index]]}${prefixLen === 1 &&
          tables.length % 2 === 0 &&
          index === tables.length + adjuster - 1
          ? " " + descendantsWrapper["repeated"]
          : ""
        }`;
    return tables[index][keys[index]];
  },
  reduceEvenChunks(
    keys_chunk: string[],
    tables: ContentItem[],
    keys: string[],
    outerIndex: number,
    prefixLen: number | undefined
  ): Record<string, ScreenBuilderTypes> {
    const adjuster = prefixLen ? -this.chunkSize! : 0;
    const e = keys_chunk.reduce((o, key, i) => {
      const result = outerIndex * this.chunkSize! + i + adjuster;
      const index = result > -1 ? result : tables.length + result;
      // console.log("even", index, outerIndex, adjuster, prefixLen);
      return {
        ...o,
        [key]: this.appender(tables, prefixLen, keys, index, adjuster),
      };
    }, {} as Record<string, ScreenBuilderTypes>);
    // console.log(JSON.stringify(e, null, 2));
    return e;
  },
  reduceUnEvenChunks(
    keys_chunks: string[][],
    keys_chunk: string[],
    tables: ContentItem[],
    keys: string[],
    outerIndex: number,
    prefixLen: number | undefined
  ): Record<string, ScreenBuilderTypes> {
    const adjuster = prefixLen ? -this.chunkSize! : 0;
    const e = {
      ...keys_chunks[outerIndex - 1].reduce((o, key, i) => {
        const result = (outerIndex - 1) * this.chunkSize! + i + adjuster;
        const index = result > -1 ? result : tables.length + result;
        // console.log("uneven1", index, outerIndex - 1);
        return i >= keys_chunk.length
          ? {
            ...o,
            [key]: tables[index][keys[index]],
          }
          : { ...o };
      }, {} as Record<string, ScreenBuilderTypes>),
      ...keys_chunk.reduce((o, key, i) => {
        const result = outerIndex * this.chunkSize! + i + adjuster;
        const index = result > -1 ? result : tables.length + result;
        // console.log("uneven2", index, outerIndex, result);
        return {
          ...o,
          [key]: tables[index][keys[index]],
        };
        }, {} as Record<string, ScreenBuilderTypes>),
    };
    // console.log(JSON.stringify(e, null, 2));
    return e;
  },
};

export default function useScreenBuilder(
  screenIndex: number,
  cs: Constraints | number[],
  contents: ContentItem[],
  prefixLen?: number
): [Record<string, ScreenBuilderTypes>[], number, (selectedIndex: number) => void] {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const turnstile = useRef<PaginatorType>({ ...Paginator });
  const screens = useMemo(() => {
    if (contents.length === 0) return [];
    const isAr = Array.isArray(cs);
    const PaginatorRef = turnstile.current;
    PaginatorRef.pageChunksizes = isAr
      ? cs
      : PaginatorRef.getChunksizes(cs);
    PaginatorRef.chunkSize = PaginatorRef.pageChunksizes[screenIndex];
    const keys = [...contents.map((col) => Object.keys(col)[0])];
    return PaginatorRef.getChunks(prefixLen, keys).map(
      (keys_chunk, index, keys_chunks) => {
        PaginatorRef.maxIndex = index;
        return keys_chunk.length === PaginatorRef.chunkSize
          ? {
            ...PaginatorRef.reduceEvenChunks(
              keys_chunk,
              contents,
              keys,
              index,
              prefixLen
            ),
          }
          : index !== 0
            ? {
              ...PaginatorRef.reduceUnEvenChunks(
                keys_chunks,
                keys_chunk,
                contents,
                keys,
                index,
                prefixLen
              ),
            }
            : prefixLen === undefined
              ? {
                ...keys.reduce(
                  (o, key, i) => ({ ...o, [key]: contents[i][keys[i]] }),
                  {} as Record<string, ScreenBuilderTypes>
                ),
              }
              : { ...contents[contents.length - 1] };
      }
    );
  }, [screenIndex, cs, contents, prefixLen]);

  useLayoutEffect(() => {
    const PaginatorRef = turnstile.current;
    if (contents.length > 0 && PaginatorRef.screenIndex !== screenIndex) {
      const prevscreen = PaginatorRef.screenIndex;
      PaginatorRef.screenIndex = screenIndex;
      PaginatorRef.calPageIndex(prevscreen);
      if (PaginatorRef.index > 0 && PaginatorRef.index >= PaginatorRef.maxIndex)
        PaginatorRef.index = PaginatorRef.maxIndex - 1;
      setActiveIndex(PaginatorRef.index);
    }
  }, [screenIndex, contents.length]);

  const handleSelect = (selectedIndex: number): void => {
    turnstile.current.index = selectedIndex;
    setActiveIndex(selectedIndex);
  };
  return [screens, activeIndex, handleSelect];
}
