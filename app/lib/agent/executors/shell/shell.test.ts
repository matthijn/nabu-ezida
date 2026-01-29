import { describe, it, expect } from "vitest"
import { createShell, type Files } from "./shell"

const makeFiles = (entries: { [key: string]: string }): Files =>
  new Map(Object.entries(entries))

type TestCase = {
  name: string
  files: { [key: string]: string }
  command: string
  expected?: string
  expectContains?: string
}

type ErrorTestCase = {
  name: string
  files: { [key: string]: string }
  command: string
  expectContains: string
}

describe("shell", () => {
  describe("cat", () => {
    const cases: TestCase[] = [
      {
        name: "reads file content",
        files: { "foo.txt": "hello world" },
        command: "cat foo.txt",
        expected: "hello world",
      },
      {
        name: "returns error for missing file",
        files: {},
        command: "cat missing.txt",
        expected: "cat: missing.txt: No such file",
      },
      {
        name: "numbers lines with -n flag",
        files: { "foo.txt": "line1\nline2\nline3" },
        command: "cat -n foo.txt",
        expected: "     1\tline1\n     2\tline2\n     3\tline3",
      },
      {
        name: "limits lines with -l",
        files: { "f.txt": "a\nb\nc\nd\ne" },
        command: "cat -l 3 f.txt",
        expected: "a\nb\nc",
      },
      {
        name: "starts at offset with -o",
        files: { "f.txt": "a\nb\nc\nd\ne" },
        command: "cat -o 3 f.txt",
        expected: "c\nd\ne",
      },
      {
        name: "combines offset and limit",
        files: { "f.txt": "a\nb\nc\nd\ne" },
        command: "cat -o 2 -l 2 f.txt",
        expected: "b\nc",
      },
      {
        name: "numbers lines with offset",
        files: { "f.txt": "a\nb\nc\nd\ne" },
        command: "cat -n -o 3 -l 2 f.txt",
        expected: "     3\tc\n     4\td",
      },
      {
        name: "rejects unsupported flag",
        files: { "foo.txt": "content" },
        command: "cat -x foo.txt",
        expectContains: "Unsupported option: '-x'",
      },
    ]

    it.each(cases)("$name", ({ files, command, expected, expectContains }) => {
      const shell = createShell(makeFiles(files))
      const result = shell.exec(command)
      if (expectContains) {
        expect(result.output).toContain(expectContains)
      } else {
        expect(result.output).toBe(expected)
      }
    })
  })

  describe("ls", () => {
    const cases: TestCase[] = [
      {
        name: "lists all files",
        files: { "a.md": "a", "b.md": "b", "other.txt": "x" },
        command: "ls",
        expected: "a.md\nb.md\nother.txt",
      },
      {
        name: "lists all files with / path",
        files: { "foo.txt": "content" },
        command: "ls /",
        expected: "foo.txt",
      },
      {
        name: "shows sizes with -l flag",
        files: { "a.md": "hello" },
        command: "ls -l",
        expected: "       5  a.md",
      },
      {
        name: "rejects non-root paths",
        files: { "foo.txt": "content" },
        command: "ls /docs",
        expectContains: "ls: only root listing allowed",
      },
      {
        name: "returns empty when no files",
        files: {},
        command: "ls",
        expected: "",
      },
    ]

    it.each(cases)("$name", ({ files, command, expected, expectContains }) => {
      const shell = createShell(makeFiles(files))
      const result = shell.exec(command)
      if (expectContains) {
        expect(result.output).toContain(expectContains)
      } else {
        expect(result.output).toBe(expected)
      }
    })
  })

  describe("grep", () => {
    const cases: TestCase[] = [
      {
        name: "finds pattern in file",
        files: { "log.txt": "error: something\ninfo: ok\nerror: another" },
        command: "grep error log.txt",
        expected: "log.txt:\terror: something\nlog.txt:\terror: another",
      },
      {
        name: "shows line numbers with -n",
        files: { "log.txt": "ok\nerror here\nok" },
        command: "grep -n error log.txt",
        expected: "log.txt:2:\terror here",
      },
      {
        name: "case insensitive with -i",
        files: { "log.txt": "ERROR: fail\nerror: also" },
        command: "grep -i error log.txt",
        expected: "log.txt:\tERROR: fail\nlog.txt:\terror: also",
      },
      {
        name: "returns missing pattern error",
        files: {},
        command: "grep",
        expected: "grep: missing pattern",
      },
      {
        name: "searches all files without filename",
        files: { "a.txt": "error here", "b.txt": "no match" },
        command: "grep error",
        expected: "a.txt:\terror here",
      },
    ]

    it.each(cases)("$name", ({ files, command, expected }) => {
      const shell = createShell(makeFiles(files))
      expect(shell.exec(command).output).toBe(expected)
    })
  })

  describe("head", () => {
    const cases: TestCase[] = [
      {
        name: "shows first 10 lines by default",
        files: { "f.txt": "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12" },
        command: "head f.txt",
        expected: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10",
      },
      {
        name: "shows first n lines with -n",
        files: { "f.txt": "a\nb\nc\nd\ne" },
        command: "head -n 3 f.txt",
        expected: "a\nb\nc",
      },
      {
        name: "works with stdin",
        files: { "f.txt": "1\n2\n3\n4\n5" },
        command: "cat f.txt | head -n 2",
        expected: "1\n2",
      },
      {
        name: "returns error for missing file",
        files: {},
        command: "head missing.txt",
        expected: "head: missing.txt: No such file",
      },
    ]

    it.each(cases)("$name", ({ files, command, expected }) => {
      const shell = createShell(makeFiles(files))
      expect(shell.exec(command).output).toBe(expected)
    })
  })

  describe("tail", () => {
    const cases: TestCase[] = [
      {
        name: "shows last 10 lines by default",
        files: { "f.txt": "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12" },
        command: "tail f.txt",
        expected: "3\n4\n5\n6\n7\n8\n9\n10\n11\n12",
      },
      {
        name: "shows last n lines with -n",
        files: { "f.txt": "a\nb\nc\nd\ne" },
        command: "tail -n 3 f.txt",
        expected: "c\nd\ne",
      },
      {
        name: "works with stdin",
        files: { "f.txt": "1\n2\n3\n4\n5" },
        command: "cat f.txt | tail -n 2",
        expected: "4\n5",
      },
      {
        name: "returns error for missing file",
        files: {},
        command: "tail missing.txt",
        expected: "tail: missing.txt: No such file",
      },
    ]

    it.each(cases)("$name", ({ files, command, expected }) => {
      const shell = createShell(makeFiles(files))
      expect(shell.exec(command).output).toBe(expected)
    })
  })

  describe("find", () => {
    const cases: TestCase[] = [
      {
        name: "finds all files by default",
        files: { "a.md": "", "b.txt": "", "other.txt": "" },
        command: "find",
        expected: "a.md\nb.txt\nother.txt",
      },
      {
        name: "finds files by pattern",
        files: { "a.md": "", "b.txt": "", "c.md": "" },
        command: "find -name *.md",
        expected: "a.md\nc.md",
      },
      {
        name: "returns empty for no matches",
        files: { "other.txt": "" },
        command: "find -name *.md",
        expected: "",
      },
    ]

    it.each(cases)("$name", ({ files, command, expected }) => {
      const shell = createShell(makeFiles(files))
      expect(shell.exec(command).output).toBe(expected)
    })
  })

  describe("wc", () => {
    const cases: TestCase[] = [
      {
        name: "counts lines words chars",
        files: { "f.txt": "hello world\nfoo bar" },
        command: "wc f.txt",
        expected: "2 4 19 f.txt",
      },
      {
        name: "counts lines only with -l",
        files: { "f.txt": "a\nb\nc" },
        command: "wc -l f.txt",
        expected: "3 f.txt",
      },
      {
        name: "counts words only with -w",
        files: { "f.txt": "one two three" },
        command: "wc -w f.txt",
        expected: "3 f.txt",
      },
      {
        name: "counts chars only with -c",
        files: { "f.txt": "hello" },
        command: "wc -c f.txt",
        expected: "5 f.txt",
      },
      {
        name: "returns error for missing file",
        files: {},
        command: "wc missing.txt",
        expected: "wc: missing.txt: No such file",
      },
    ]

    it.each(cases)("$name", ({ files, command, expected }) => {
      const shell = createShell(makeFiles(files))
      expect(shell.exec(command).output).toBe(expected)
    })
  })

  describe("piping", () => {
    const cases: TestCase[] = [
      {
        name: "pipes cat to grep",
        files: { "log.txt": "error: bad\ninfo: ok\nerror: worse" },
        command: "cat log.txt | grep error",
        expected: "error: bad\nerror: worse",
      },
      {
        name: "pipes cat with limit to wc",
        files: { "f.txt": "1\n2\n3\n4\n5" },
        command: "cat -l 3 f.txt | wc -l",
        expected: "3",
      },
      {
        name: "pipes grep to wc",
        files: { "log.txt": "error: a\ninfo: b\nerror: c\nerror: d" },
        command: "cat log.txt | grep error | wc -l",
        expected: "3",
      },
      {
        name: "three stage pipeline",
        files: { "f.txt": "apple\nbanana\napricot\ncherry" },
        command: "cat f.txt | grep ap | wc -l",
        expected: "2",
      },
    ]

    it.each(cases)("$name", ({ files, command, expected }) => {
      const shell = createShell(makeFiles(files))
      expect(shell.exec(command).output).toBe(expected)
    })
  })

  describe("chaining", () => {
    const cases: TestCase[] = [
      {
        name: "&& runs second when first succeeds",
        files: { "a.txt": "aaa", "b.txt": "bbb" },
        command: "cat a.txt && cat b.txt",
        expected: "aaa\nbbb",
      },
      {
        name: "&& skips second when first fails",
        files: { "b.txt": "bbb" },
        command: "cat missing.txt && cat b.txt",
        expected: "cat: missing.txt: No such file",
      },
      {
        name: "|| runs second when first fails",
        files: { "b.txt": "bbb" },
        command: "cat missing.txt || cat b.txt",
        expected: "cat: missing.txt: No such file\nbbb",
      },
      {
        name: "|| skips second when first succeeds",
        files: { "a.txt": "aaa", "b.txt": "bbb" },
        command: "cat a.txt || cat b.txt",
        expected: "aaa",
      },
      {
        name: "; runs both regardless of success",
        files: { "b.txt": "bbb" },
        command: "cat missing.txt ; cat b.txt",
        expected: "cat: missing.txt: No such file\nbbb",
      },
      {
        name: "; runs both when both succeed",
        files: { "a.txt": "aaa", "b.txt": "bbb" },
        command: "cat a.txt ; cat b.txt",
        expected: "aaa\nbbb",
      },
      {
        name: "mixed && and || operators",
        files: { "c.txt": "ccc" },
        command: "cat missing.txt && cat also-missing.txt || cat c.txt",
        expected: "cat: missing.txt: No such file\nccc",
      },
      {
        name: "&& chain stops at first failure",
        files: { "a.txt": "aaa", "c.txt": "ccc" },
        command: "cat a.txt && cat missing.txt && cat c.txt",
        expected: "aaa\ncat: missing.txt: No such file",
      },
    ]

    it.each(cases)("$name", ({ files, command, expected }) => {
      const shell = createShell(makeFiles(files))
      expect(shell.exec(command).output).toBe(expected)
    })
  })

  describe("rm", () => {
    it("emits delete operation for single file", () => {
      const shell = createShell(makeFiles({ "a.txt": "content" }))
      const result = shell.exec("rm a.txt")
      expect(result.output).toBe("rm a.txt")
      expect(result.operations).toEqual([{ type: "delete", path: "a.txt" }])
    })

    it("emits delete operations for multiple files", () => {
      const shell = createShell(makeFiles({ "a.txt": "a", "b.txt": "b" }))
      const result = shell.exec("rm a.txt b.txt")
      expect(result.operations).toEqual([
        { type: "delete", path: "a.txt" },
        { type: "delete", path: "b.txt" },
      ])
    })

    it("emits delete operations for glob pattern", () => {
      const shell = createShell(makeFiles({ "a.txt": "a", "b.txt": "b", "c.md": "c" }))
      const result = shell.exec("rm *.txt")
      expect(result.operations).toEqual([
        { type: "delete", path: "a.txt" },
        { type: "delete", path: "b.txt" },
      ])
    })

    it("reports error for missing file", () => {
      const shell = createShell(makeFiles({}))
      const result = shell.exec("rm missing.txt")
      expect(result.output).toContain("No such file")
      expect(result.operations).toEqual([])
    })

    it("reports error for no matches on glob", () => {
      const shell = createShell(makeFiles({ "a.md": "a" }))
      const result = shell.exec("rm *.txt")
      expect(result.output).toContain("no matches")
      expect(result.operations).toEqual([])
    })
  })

  describe("mv", () => {
    it("emits rename operation", () => {
      const shell = createShell(makeFiles({ "old.txt": "content" }))
      const result = shell.exec("mv old.txt new.txt")
      expect(result.output).toBe("mv old.txt new.txt")
      expect(result.operations).toEqual([{ type: "rename", path: "old.txt", newPath: "new.txt" }])
    })

    it("reports error for missing source", () => {
      const shell = createShell(makeFiles({}))
      const result = shell.exec("mv missing.txt new.txt")
      expect(result.output).toContain("No such file")
      expect(result.operations).toEqual([])
    })

    it("reports error when destination exists", () => {
      const shell = createShell(makeFiles({ "a.txt": "a", "b.txt": "b" }))
      const result = shell.exec("mv a.txt b.txt")
      expect(result.output).toContain("already exists")
      expect(result.operations).toEqual([])
    })
  })

  describe("cp", () => {
    it("emits create operation with source content", () => {
      const shell = createShell(makeFiles({ "src.txt": "content" }))
      const result = shell.exec("cp src.txt dest.txt")
      expect(result.output).toBe("cp src.txt dest.txt")
      expect(result.operations).toEqual([{ type: "create", path: "dest.txt", content: "content" }])
    })

    it("reports error for missing source", () => {
      const shell = createShell(makeFiles({}))
      const result = shell.exec("cp missing.txt new.txt")
      expect(result.output).toContain("No such file")
      expect(result.operations).toEqual([])
    })

    it("reports error when destination exists", () => {
      const shell = createShell(makeFiles({ "a.txt": "a", "b.txt": "b" }))
      const result = shell.exec("cp a.txt b.txt")
      expect(result.output).toContain("already exists")
      expect(result.operations).toEqual([])
    })
  })

  describe("errors", () => {
    const cases: ErrorTestCase[] = [
      {
        name: "rejects unknown command",
        files: {},
        command: "unknown",
        expectContains: "Unknown command: 'unknown'",
      },
      {
        name: "rejects redirect operator",
        files: {},
        command: "echo foo > file.txt",
        expectContains: "Unsupported operator: '>'",
      },
      {
        name: "rejects append operator",
        files: {},
        command: "echo foo >> file.txt",
        expectContains: "Unsupported operator: '>>'",
      },
      {
        name: "rejects input redirect",
        files: {},
        command: "cat < file.txt",
        expectContains: "Unsupported operator: '<'",
      },
      {
        name: "strips 2>/dev/null silently",
        files: { "f.txt": "hello" },
        command: "cat f.txt 2>/dev/null",
        expectContains: "hello",
      },
      {
        name: "rejects command substitution",
        files: {},
        command: "echo $(cat file.txt)",
        expectContains: "Unsupported operator: '$('",
      },
    ]

    it.each(cases)("$name", ({ files, command, expectContains }) => {
      const shell = createShell(makeFiles(files))
      expect(shell.exec(command).output).toContain(expectContains)
    })
  })

  describe("help", () => {
    it("returns help text", () => {
      const shell = createShell(makeFiles({}))
      const help = shell.exec("help").output
      expect(help).toContain("cat - Print file contents")
      expect(help).toContain("grep - Search for patterns in files")
      expect(help).toContain("ls - List files")
    })
  })

  describe("empty input", () => {
    it("returns empty for empty input", () => {
      const shell = createShell(makeFiles({}))
      expect(shell.exec("").output).toBe("")
      expect(shell.exec("   ").output).toBe("")
    })
  })

  describe("quoted arguments", () => {
    it("handles quoted arguments with spaces", () => {
      const shell = createShell(makeFiles({ "my file.txt": "content" }))
      expect(shell.exec('cat "my file.txt"').output).toBe("content")
    })
  })
})
