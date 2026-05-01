import {
  createContext,
  type ParentProps,
  useContext,
  type Accessor,
} from "solid-js";
import cyclesJson from "../../data/cycles.json";
import junoExponentJson from "../../data/juno_exponent.json";
import junoPremiumJson from "../../data/juno_premium.json";
import techsJson from "../../data/techs.json";
import techsSeEffectJson from "../../data/techs_se_effect.json";
import zatGuidesJson from "../../data/zat_guides.json";
import zatNodesJson from "../../data/zat_nodes.json";

export type CycleRule = {
  cycle: number;
  mult: number;
};

export type JunoExponentType =
  | "qa"
  | "se"
  | "player"
  | "research"
  | "dcm"
  | "crystal";

export type JunoExponentRule = {
  type: JunoExponentType;
  level: number;
  exp: number;
};

export type JunoPremiumRule = {
  name: string;
  min?: number;
  max?: number;
  value: number;
  mode: "add" | "mul";
};

export type TechCostCurveRule = {
  level: number;
  mult: string;
};

export type TechRule = {
  id: number;
  initCost: string;
  costCurve: TechCostCurveRule[];
  dcBoost?: number;
  junoBase?: number;
  extraJunoBase?: number;
  extraJunoExp?: number;
  seMultiplier?: number;
  seAdditive?: number;
};

export type TechSeEffectRule = {
  se: number;
  kind: "mul" | "div";
  value: number;
};

export type ZatNodeRule = {
  id: number;
  name: string;
  maxLv?: number;
  cost?: number;
  techMul?: number;
  shareMul?: number;
  junoMul?: number;
  dcMul?: number;
  sqrt?: boolean;
  x: number;
  y: number;
  req?: number;
};

export type ZatGuideEntry = {
  cycle: number;
  run: string;
  nodes: number[];
  note?: string;
};

export type ZatDataBundle = {
  cycles: CycleRule[];
  junoExponent: JunoExponentRule[];
  junoPremium: JunoPremiumRule[];
  techs: TechRule[];
  techsSeEffect: TechSeEffectRule[];
  zatGuides: ZatGuideEntry[];
  zatNodes: ZatNodeRule[];
};

const parseJunoExponent = (raw: unknown[]): JunoExponentRule[] => {
  return raw
    .map((entry) => {
      const candidate = entry as {
        type?: JunoExponentType;
        level?: number;
        "level:"?: number;
        exp?: number;
      };

      const level =
        typeof candidate.level === "number"
          ? candidate.level
          : typeof candidate["level:"] === "number"
            ? candidate["level:"]
            : 0;

      return {
        type: candidate.type ?? "se",
        level,
        exp: candidate.exp ?? 0,
      };
    })
    .sort((a, b) => a.level - b.level);
};

const dataBundle: ZatDataBundle = {
  cycles: (cyclesJson as CycleRule[]).slice(),
  junoExponent: parseJunoExponent(junoExponentJson as unknown[]),
  junoPremium: (junoPremiumJson as JunoPremiumRule[]).slice(),
  techs: (techsJson as TechRule[]).slice().sort((a, b) => a.id - b.id),
  techsSeEffect: (techsSeEffectJson as TechSeEffectRule[]).slice(),
  zatGuides: (zatGuidesJson as ZatGuideEntry[]).slice(),
  zatNodes: (zatNodesJson as ZatNodeRule[]).slice(),
};

const ZatDataContext = createContext<Accessor<ZatDataBundle>>();

export function ZatDataProvider(props: ParentProps) {
  const accessor = () => dataBundle;
  return (
    <ZatDataContext.Provider value={accessor}>
      {props.children}
    </ZatDataContext.Provider>
  );
}

export function useZatData(): Accessor<ZatDataBundle> {
  const context = useContext(ZatDataContext);
  if (!context) {
    throw new Error("useZatData must be used inside ZatDataProvider");
  }
  return context;
}
