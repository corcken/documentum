import fs from "fs/promises"
import path from "path"
import os from "os"

export interface StorageBackend {
  /**
   * Speichert eine Datei (Buffer) unter dem angegebenen Schlüssel.
   */
  put(key: string, data: Buffer): Promise<void>
  
  /**
   * Liest eine Datei (Buffer) anhand ihres Schlüssels.
   */
  get(key: string): Promise<Buffer | null>
  
  /**
   * Löscht eine Datei anhand ihres Schlüssels.
   */
  delete(key: string): Promise<void>
}

// Lokales Backend: ~/.documentum-uploads
class LocalStorageBackend implements StorageBackend {
  private baseDir: string

  constructor() {
    // Configurable via UPLOAD_DIR env, otherwise ~/.documentum-uploads
    const home = os.homedir()
    this.baseDir = process.env.UPLOAD_DIR || path.join(home, ".documentum-uploads")
  }

  private async ensureDir() {
    await fs.mkdir(this.baseDir, { recursive: true })
  }

  async put(key: string, data: Buffer): Promise<void> {
    await this.ensureDir()
    const filePath = path.join(this.baseDir, key)
    await fs.writeFile(filePath, data)
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.baseDir, key)
      return await fs.readFile(filePath)
    } catch (e: any) {
      if (e.code === "ENOENT") return null
      throw e
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, key)
      await fs.unlink(filePath)
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e
    }
  }
}

// Instanziierung (hier könnte später je nach ENV auch ein S3Backend exportiert werden)
export const storage = new LocalStorageBackend()
