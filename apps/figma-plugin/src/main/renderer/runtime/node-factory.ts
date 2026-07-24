import type { DesignIrNode, DesignIrNodeType } from "@aio/design-ir";
import type { RenderContext } from "./render-context";

export interface CreatedFigmaNode {
  irNodeId: string;
  figmaNodeId: string;
  childContainer: boolean;
  placeholder: boolean;
}

export interface DesignIrNodeFactory<TNode extends DesignIrNode = DesignIrNode> {
  readonly nodeType: TNode["nodeType"];
  create(node: TNode, context: RenderContext): Promise<CreatedFigmaNode>;
}

export interface RendererRegistry {
  register(factory: DesignIrNodeFactory): void;
  resolve(nodeType: DesignIrNodeType): DesignIrNodeFactory;
}

export function createRendererRegistry(): RendererRegistry {
  const factories = new Map<DesignIrNodeType, DesignIrNodeFactory>();
  return {
    register(factory) {
      if (factories.has(factory.nodeType)) throw new Error(`RENDER_FACTORY_NOT_FOUND: duplicate factory ${factory.nodeType}`);
      factories.set(factory.nodeType, factory);
    },
    resolve(nodeType) {
      const factory = factories.get(nodeType);
      if (!factory) throw new Error(`RENDER_FACTORY_NOT_FOUND: ${nodeType}`);
      return factory;
    }
  };
}
