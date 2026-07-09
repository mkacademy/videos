import { Link } from "react-router-dom";
import IconsWidget from "../navbar/IconsWidget";
import React, { useMemo, createRef, useEffect } from "react";
import LinkifiedText from "../LinkifiedText";
import { placeholder, textEllipsis, CookIngredientsProps } from "../../utils";
import { DataRow } from "../Core/types";
import { IconKey } from "../../Hooks/useIconsAssembler";
import * as styles from "../../styles/instruction.module.css";
import * as instructionsStyles from "../../styles/instructions.module.css";

const stylesProps = {
  instruction: styles["instruction"],
  longParagraph: styles["longParagraph"],
  checked: styles["checked"],
  stepNumber: styles["stepNumber"],
  stepName: styles["stepName"],
  stepContent: styles["stepContent"],
  Instructionimg: styles["Instructionimg"],
  paragraph: instructionsStyles["paragraph"],
  stepNumber_: instructionsStyles["stepNumber"],
  stepName_: instructionsStyles["stepName"],
  stepContent_: instructionsStyles["stepContent"],
};

export interface InstructionItem extends DataRow {
  checked: boolean;
  instruction: string;
  imageurl: string;
  details: string;
}

interface InstructionProps {
  preserveIngredients: (ingredients: CookIngredientsProps) => void;
  instructions: InstructionItem[];
  scrollToIndex: number;
  defaultTake: number;
  toggler: (id: number) => void;
  icons: Record<IconKey, string> | undefined;
  curApp: number;
}

const getFromData = (e: React.MouseEvent<HTMLAnchorElement>, id: number, toggler: (id: number) => void): void => {
  e.preventDefault();
  toggler(id);
};

export const isValidDataUrl = (url: string): boolean => {
  if (!url.startsWith("data:image")) return false;
  try {
    // Check if it's a valid data URL format: data:image/[type];base64,[data]
    const parts = url.split(",");
    if (parts.length !== 2) return false;
    const header = parts[0];
    // Should have format: data:image/[type];base64
    if (!header.includes("data:image/") || !header.includes(";base64")) return false;
    // Check if base64 data exists and is not empty
    const data = parts[1];
    if (!data || data.trim().length === 0) return false;
    return true;
  } catch {
    return false;
  }
};

/** True for complete base64 data URLs and bare image placeholders (data:image, data:image/jpeg, …). */
export const isImageDataUrlOrPlaceholder = (url: string): boolean => {
  if (!url.startsWith("data:image")) return false;
  if (isValidDataUrl(url)) return true;
  return url === "data:image" || /^data:image\/[a-zA-Z0-9+.-]+$/.test(url);
};

export default function Instruction({
  preserveIngredients,
  scrollToIndex,
  instructions,
  defaultTake,
  toggler,
  icons,
  curApp,
}: InstructionProps) {
  const refs = useMemo(
    () => Array.from({ length: instructions.length }).map(() => createRef<HTMLDivElement>()),
    [instructions.length]
  );

  useEffect(() => {
    refs[scrollToIndex]?.current?.scrollIntoView();
  }, [refs, scrollToIndex]);

  return (
    <div className={stylesProps.instruction}>
      {instructions.map((instruction, i) => {
        const stirIngredients = (e: React.MouseEvent<HTMLAnchorElement>) => getFromData(e, instruction.id as number, toggler);
        const classes = instruction.checked
          ? `${stylesProps.paragraph} ${stylesProps.longParagraph} ${stylesProps.checked}`
          : `${stylesProps.paragraph} ${stylesProps.longParagraph}`;
        const hasImage = isValidDataUrl(instruction.imageurl);
        const imageUrl = hasImage ? instruction.imageurl : placeholder;
        return (
          <div ref={refs[i]} className={classes} key={instruction.id}>
            <span className={stylesProps.stepNumber + ' ' + stylesProps.stepNumber_}>{i + 1}</span>
            <Link to="#" onClick={stirIngredients}>
              <span className={stylesProps.stepName + ' ' + stylesProps.stepName_}>{instruction.instruction}</span>
            </Link>
            <IconsWidget
              preserveIngredients={preserveIngredients}
              defaultTake={defaultTake}
              data={instruction}
              curApp={curApp}
              icons={icons}
              inline
            />
            <React.Fragment>
              {instruction.imageurl.startsWith("data:image") ? (
                <img
                  src={imageUrl}
                  className={stylesProps.Instructionimg}
                  alt={instruction.instruction}
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    console.log("image_error");
                    target.src = placeholder;
                  }}
                />
              ) : (
                <p className={stylesProps.stepContent + ' ' + stylesProps.stepContent_}>
                  {textEllipsis(instruction.imageurl)}
                </p>
              )}
            </React.Fragment>

            <p className={stylesProps.stepContent + ' ' + stylesProps.stepContent_}>
              <LinkifiedText text={instruction.details ?? ""} />
            </p>
          </div>
        );
      })}
    </div>
  );
}
