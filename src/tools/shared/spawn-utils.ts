import { spawn } from "bun"

export interface SpawnResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface SpawnWithTimeoutOptions {
  cwd?: string
  errorLabel?: string
}

export async function spawnWithTimeout(
  command: string,
  args: string[],
  timeout: number,
  opts?: SpawnWithTimeoutOptions,
): Promise<SpawnResult> {
  const proc = spawn([command, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: opts?.cwd,
  })

  const label = opts?.errorLabel ?? "Command"

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      proc.kill()
      reject(new Error(`${label} timeout after ${timeout}ms`))
    }, timeout)
    proc.exited.then(() => clearTimeout(id))
  })

  try {
    const stdout = await Promise.race([new Response(proc.stdout).text(), timeoutPromise])
    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited
    return { stdout, stderr, exitCode }
  } catch (e) {
    proc.kill()
    throw e
  }
}
