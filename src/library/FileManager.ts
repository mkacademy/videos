import { SerializableFile } from '../store/slices/settingsSlice';

/**
 * FileManager - Manages File objects outside of Redux state
 * to avoid serialization issues while maintaining functionality
 */
class FileManager {
  private static instance: FileManager;
  private fileStore = new Map<string, File>();

  private constructor() {}

  static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }

  /**
   * Store files and return their serializable metadata
   */
  storeFiles(files: File[]): SerializableFile[] {
    return files.map(file => {
      const id = this.generateFileId(file);
      this.fileStore.set(id, file);
      
      return {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        webkitRelativePath: file.webkitRelativePath
      };
    });
  }

  /**
   * Get stored File object by its serializable metadata
   */
  getFile(serializableFile: SerializableFile): File | undefined {
    return this.fileStore.get(serializableFile.id);
  }

  /**
   * Get multiple File objects from serializable metadata
   */
  getFiles(serializableFiles: SerializableFile[]): File[] {
    return serializableFiles
      .map(sf => this.getFile(sf))
      .filter((file): file is File => file !== undefined);
  }

  /**
   * Clear all stored files
   */
  clearFiles(): void {
    this.fileStore.clear();
  }

  /**
   * Remove specific files by their IDs
   */
  removeFiles(ids: string[]): void {
    ids.forEach(id => this.fileStore.delete(id));
  }

  /**
   * Generate a unique ID for a file based on its properties
   */
  private generateFileId(file: File): string {
    return `${file.name}_${file.size}_${file.lastModified}_${Date.now()}`;
  }

  /**
   * Get the number of stored files
   */
  getStoredFileCount(): number {
    return this.fileStore.size;
  }
}

export const fileManager = FileManager.getInstance();
export default FileManager;
