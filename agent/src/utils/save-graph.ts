import fs from "fs";
import type { CompiledStateGraph } from "@langchain/langgraph";

export const saveGraphAsPng = async <S, U, I extends string>(
  graph: CompiledStateGraph<S, U, I, any, any, any, any, any, any, any>,
  filePath: string,
): Promise<void> => {
  try {
    const representation = await graph.getGraphAsync();
    const image = await representation.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Failed to save graph as PNG:", error);
  }
};
