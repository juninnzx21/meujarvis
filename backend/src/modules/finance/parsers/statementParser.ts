import type { StatementFileType } from "@prisma/client";
import { parseInterCsvStatement } from "./interCsvParser.js";
import { parseOfxStatement } from "./ofxParser.js";
import type { ParsedStatement } from "./types.js";

export function parseStatementContent(fileType: StatementFileType, content: string, fileName: string): ParsedStatement {
  if (fileType === "ofx") return parseOfxStatement(content);
  if (fileType === "csv" || fileType === "txt") return parseInterCsvStatement(content);
  return {
    fileType,
    transactions: [],
    metadata: { parser: "unsupported", fileName }
  };
}
