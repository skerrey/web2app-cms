import type { ComponentType } from "react"
import type { Block } from "../types"
import TextBlock from "./TextBlock"
import HeroBlock from "./HeroBlock"
import ButtonBlock from "./ButtonBlock"
import ImageBlock from "./ImageBlock"
import GridBlock from "./GridBlock"

export interface BlockRendererProps {
  data: Block["data"]
  styles?: Block["styles"]
}

export const blockRegistry: Record<
  Block["type"],
  ComponentType<BlockRendererProps>
> = {
  text: TextBlock as ComponentType<BlockRendererProps>,
  hero: HeroBlock as ComponentType<BlockRendererProps>,
  button: ButtonBlock as ComponentType<BlockRendererProps>,
  image: ImageBlock as ComponentType<BlockRendererProps>,
  grid: GridBlock as ComponentType<BlockRendererProps>
}

export const getBlockComponent = (
  type: Block["type"]
): ComponentType<BlockRendererProps> | undefined => blockRegistry[type]

export { TextBlock, HeroBlock, ButtonBlock, ImageBlock, GridBlock }
