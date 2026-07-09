import type { Quiz } from '../../store/slices/quizSlice';
import type { MediaPlayerTab } from '../mediaPlayer/mediaPlayerUtils';
import type { ImportDestination } from './types';

const VALID_VIDEO_EXTENSION_PATTERN = /\.(mp4|mov|webm|mkv|avi|wmv|m4v|mpeg|mpg|ts|3gp)$/i;

export function isValidVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  return VALID_VIDEO_EXTENSION_PATTERN.test(file.name);
}

export function getImportDestinationForTab(tab: MediaPlayerTab): ImportDestination {
  switch (tab) {
    case 'tutorial':
      return 'tutorial';
    case 'course':
      return 'course';
    default:
      return 'quiz';
  }
}

export function getImportDestinationLabelForTab(tab: MediaPlayerTab): string {
  switch (tab) {
    case 'tutorial':
      return 'tutorials (audio chunks)';
    case 'course':
      return 'courses (with thumbnails)';
    default:
      return 'quizzes (matched by folder name, one banner per size)';
  }
}

export function getAcceptedFileTypes(tab: MediaPlayerTab): string {
  return tab === 'tutorial' ? 'audio/*' : 'video/*';
}

export function getDropZoneHint(tab: MediaPlayerTab): string {
  if (tab === 'tutorial') {
    return 'MP3, WAV, M4A, AAC, OGG, FLAC, and other common audio formats';
  }
  if (tab === 'quiz') {
    return 'MP4, MOV, WebM, MKV, and other common video formats. The video must live in a folder whose name matches an existing quiz title.';
  }
  return 'MP4, MOV, WebM, MKV, and other common video formats';
}

function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase();
}

/** Directory path segments (and joined path) relative to a picked folder, derived from `webkitRelativePath`. */
export function getFilesystemPathHints(file: File): string[] {
  const relativePath = file.webkitRelativePath?.replace(/\\/g, '/').trim();
  if (!relativePath) return [];

  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length <= 1) return [];

  const directoryParts = parts.slice(0, -1);
  const hints = new Set<string>();
  directoryParts.forEach((part) => hints.add(part));
  hints.add(directoryParts.join('/'));
  return [...hints];
}

export function quizTitleMatchesFilesystemHint(quizTitle: string, hint: string): boolean {
  const normalizedTitle = normalizeMatchText(quizTitle);
  const normalizedHint = normalizeMatchText(hint);
  if (!normalizedTitle || !normalizedHint) return false;
  return normalizedHint === normalizedTitle || normalizedHint.includes(normalizedTitle);
}

export function findQuizMatchingFilesystemFolder(quizzes: Quiz[], folderHints: string[]): Quiz | undefined {
  if (folderHints.length === 0) return undefined;
  return quizzes.find((quiz) => {
    if (quiz.isDismissed) return false;
    const title = quiz.title ?? '';
    return folderHints.some((hint) => quizTitleMatchesFilesystemHint(title, hint));
  });
}

export function formatQuizFolderPathError(): string {
  return 'Could not determine this video\'s folder path. Select the video from a folder on your computer so its path can be matched to an existing quiz title, or use the Course tab instead.';
}

export function formatQuizFolderMatchError(folderHints: string[]): string {
  const folderLabel = folderHints.join(' / ');
  return `No quiz title matches the folder "${folderLabel}". Use the Course tab instead, or create a quiz whose title equals (or is contained in) that folder name on your filesystem.`;
}

export type QuizVideoCandidate = {
  file: File;
  folderKey: string;
  relativePath: string;
};

const collectQuizVideoFilesFromDirectory = async (
  handle: FileSystemDirectoryHandle,
  parentDirName: string | null,
  rootFolderName: string,
  candidates: QuizVideoCandidate[],
): Promise<void> => {
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === 'directory') {
      await collectQuizVideoFilesFromDirectory(
        entry as FileSystemDirectoryHandle,
        name,
        rootFolderName,
        candidates,
      );
      continue;
    }

    const file = await (entry as FileSystemFileHandle).getFile();
    if (!isValidVideoFile(file)) continue;

    const folderKey = parentDirName ?? rootFolderName;
    const relativePath = parentDirName ? `${parentDirName}/${name}` : name;
    candidates.push({ file, folderKey, relativePath });
  }
};

export async function collectQuizVideoCandidatesFromDirectory(
  root: FileSystemDirectoryHandle,
): Promise<QuizVideoCandidate[]> {
  const candidates: QuizVideoCandidate[] = [];
  await collectQuizVideoFilesFromDirectory(root, null, root.name, candidates);
  return candidates;
}

export function getQuizFolderHints(folderKey: string): string[] {
  const normalized = folderKey.trim();
  return normalized ? [normalized] : [];
}

export function toQuizVideoCandidateFromFile(file: File): QuizVideoCandidate | null {
  const folderHints = getFilesystemPathHints(file);
  const folderKey = folderHints[0];
  if (!folderKey) return null;
  return {
    file,
    folderKey,
    relativePath: file.webkitRelativePath || file.name,
  };
}
