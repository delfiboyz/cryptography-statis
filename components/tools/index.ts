import type { ComponentType } from "react";

import type { ToolSlug } from "@/lib/tools";

import { AesTool } from "./aes-tool";
import { ClassicTool } from "./classic-tool";
import { EncodingTool } from "./encoding-tool";
import { FileTool } from "./file-tool";
import { HashTool } from "./hash-tool";
import { HmacTool } from "./hmac-tool";
import { JwtTool } from "./jwt-tool";
import { KeysTool } from "./keys-tool";
import { PasswordTool } from "./password-tool";
import { RandomTool } from "./random-tool";
import { SignatureTool } from "./signature-tool";

export const TOOL_COMPONENTS: Record<ToolSlug, ComponentType> = {
  hash: HashTool,
  hmac: HmacTool,
  aes: AesTool,
  file: FileTool,
  keys: KeysTool,
  signature: SignatureTool,
  jwt: JwtTool,
  password: PasswordTool,
  random: RandomTool,
  encoding: EncodingTool,
  classic: ClassicTool,
};
