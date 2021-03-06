import * as vscode from "vscode"
import { fromUri } from "../adt/AdtServer"
import { FileSystemError, FileChangeType } from "vscode"

export class FsProvider implements vscode.FileSystemProvider {
  private _eventEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this
    ._eventEmitter.event

  watch(
    uri: vscode.Uri,
    options: { recursive: boolean; excludes: string[] }
  ): vscode.Disposable {
    return new vscode.Disposable(() => undefined)
  }

  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    if (uri.path === "/.vscode") throw FileSystemError.FileNotFound(uri)
    const server = fromUri(uri)
    if (uri.path === "/") return server.findNode(uri)
    return server.stat(uri)
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const server = fromUri(uri)
    const dir = server.findNode(uri)
    await server.refreshDirIfNeeded(dir)
    const contents = [...dir].map(
      ([name, node]) => [name, node.type] as [string, vscode.FileType]
    )
    return contents
  }
  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    throw FileSystemError.NoPermissions(
      "Not a real filesystem, directory creation is not supported"
    )
  }
  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const server = fromUri(uri)
    const file = server.findNode(uri)

    try {
      if (file && !file.isFolder) return file.fetchContents(server.connection)
    } catch (error) {}
    throw FileSystemError.Unavailable(uri)
  }
  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const server = fromUri(uri)
    const file = server.findNode(uri)
    if (!file && options.create)
      throw FileSystemError.NoPermissions(
        "Not a real filesystem, file creation is not supported"
      )
    if (!file) throw FileSystemError.FileNotFound(uri)
    await server.saveFile(file, content)
    this._eventEmitter.fire([{ type: FileChangeType.Changed, uri }])
  }
  delete(
    uri: vscode.Uri,
    options: { recursive: boolean }
  ): void | Thenable<void> {
    throw new Error("Method not implemented.")
  }
  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): void | Thenable<void> {
    throw new Error("Method not implemented.")
  }
}
