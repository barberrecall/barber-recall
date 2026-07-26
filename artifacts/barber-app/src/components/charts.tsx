import { useState } from "react";
import { View, Text, Pressable, type LayoutChangeEvent } from "react-native";
import Svg, {
  Path,
  Rect,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import type { ChartPoint } from "@workspace/api-client-react";

/**
 * Gráficos desenhados direto em SVG.
 *
 * Escolha deliberada de não trazer biblioteca: os dados têm 6–7 pontos e uma
 * série só, `react-native-svg` já é dependência do projeto, e as alternativas
 * custam caro — victory-native v41 exige @shopify/react-native-skia, um módulo
 * nativo que inviabilizaria rodar no Expo Go.
 *
 * Monocromático, como o resto do app: a série é quase preta sobre cartão branco.
 * Isso resolveu de graça o problema que o âmbar tinha aqui — ele rendia só
 * 2.09:1 de contraste contra superfície clara, abaixo do mínimo de 3:1, e
 * obrigava a usar um tom mais escuro só nos gráficos. Preto sobre branco passa
 * com folga e é a mesma tinta dos títulos.
 */
const SERIES = "#141416";
const GRID = "#E6E6EA";

/** Cor do cartão, usada no anel que separa o marcador da linha. */
const SURFACE = "#FFFFFF";

const CHART_HEIGHT = 160;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 22;
const PADDING_LEFT = 4;

const money = (value: number) => `R$ ${value.toFixed(0)}`;

function useChartTheme() {
  return { series: SERIES, grid: GRID, surface: SURFACE };
}

/** Topo "bonito" da escala, para a malha cair em números redondos. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function ChartFrame({
  title,
  subtitle,
  children,
  onLayout,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View className="rounded-card bg-surface p-5">
      {/* Série única: o título nomeia o dado, então não existe legenda. */}
      <Text className="text-sm font-semibold text-ink">{title}</Text>
      {subtitle ? (
        <Text className="mt-0.5 text-xs text-ink-muted">{subtitle}</Text>
      ) : null}
      <View className="mt-3" onLayout={onLayout}>
        {children}
      </View>
    </View>
  );
}

function EmptyPlot() {
  return (
    <View className="items-center justify-center" style={{ height: CHART_HEIGHT }}>
      <Text className="text-xs text-ink-muted">Sem dados no período.</Text>
    </View>
  );
}

function XLabels({ points, selected }: { points: ChartPoint[]; selected: number | null }) {
  return (
    <View className="mt-1 flex-row">
      {points.map((point, index) => (
        <Text
          key={`${point.label}-${index}`}
          numberOfLines={1}
          className={`flex-1 text-center text-[10px] ${
            selected === index ? "font-semibold text-ink" : "text-ink-muted"
          }`}
        >
          {point.label}
        </Text>
      ))}
    </View>
  );
}

/**
 * Barras para magnitude por categoria.
 *
 * Tocar numa barra revela o valor — é o equivalente móvel do hover, que não
 * existe por toque. O máximo já vem rotulado por padrão, então o gráfico
 * comunica a informação principal sem exigir interação.
 */
export function BarChartCard({
  title,
  subtitle,
  points,
  formatValue = String,
}: {
  title: string;
  subtitle?: string;
  points: ChartPoint[];
  formatValue?: (value: number) => string;
}) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const hasData = points.length > 0 && points.some((point) => point.value > 0);
  const max = niceMax(Math.max(...points.map((point) => point.value), 0));
  const maxIndex = points.reduce(
    (best, point, index) => (point.value > points[best].value ? index : best),
    0,
  );

  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const slot = width > 0 ? (width - PADDING_LEFT * 2) / points.length : 0;
  // 2px de respiro entre barras vizinhas, como manda a especificação de marcas.
  const barWidth = Math.max(6, Math.min(36, slot - 8));

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {!hasData ? (
        <EmptyPlot />
      ) : width > 0 ? (
        <>
          <Svg width={width} height={CHART_HEIGHT}>
            {/* Malha recessiva: presente para leitura, nunca competindo com os dados. */}
            {[0, 0.5, 1].map((ratio) => (
              <Line
                key={ratio}
                x1={0}
                x2={width}
                y1={PADDING_TOP + plotHeight * ratio}
                y2={PADDING_TOP + plotHeight * ratio}
                stroke={theme.grid}
                strokeWidth={1}
              />
            ))}

            {points.map((point, index) => {
              const barHeight = max > 0 ? (point.value / max) * plotHeight : 0;
              const x = PADDING_LEFT + slot * index + (slot - barWidth) / 2;
              const y = PADDING_TOP + plotHeight - barHeight;
              const isActive = selected === index || (selected === null && index === maxIndex);

              return (
                <Rect
                  key={`${point.label}-${index}`}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, point.value > 0 ? 2 : 0)}
                  // Ponta arredondada só no topo: a base fica ancorada na linha zero.
                  rx={4}
                  fill={theme.series}
                  opacity={isActive ? 1 : 0.55}
                />
              );
            })}
          </Svg>

          {/* Alvos de toque maiores que as barras, sobrepostos ao gráfico. */}
          <View className="absolute left-0 right-0 flex-row" style={{ height: CHART_HEIGHT }}>
            {points.map((point, index) => (
              <Pressable
                key={`hit-${point.label}-${index}`}
                onPress={() => setSelected(selected === index ? null : index)}
                accessibilityRole="button"
                accessibilityLabel={`${point.label}: ${formatValue(point.value)}`}
                className="flex-1"
              />
            ))}
          </View>

          <View className="mt-1 items-center">
            <Text className="text-xs font-semibold text-ink">
              {selected !== null
                ? `${points[selected].label}: ${formatValue(points[selected].value)}`
                : `Maior: ${points[maxIndex].label} · ${formatValue(points[maxIndex].value)}`}
            </Text>
          </View>

          <XLabels points={points} selected={selected} />
        </>
      ) : null}
    </ChartFrame>
  );
}

/** Área para evolução no tempo. Mesma interação por toque das barras. */
export function AreaChartCard({
  title,
  subtitle,
  points,
  formatValue = String,
}: {
  title: string;
  subtitle?: string;
  points: ChartPoint[];
  formatValue?: (value: number) => string;
}) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const hasData = points.length > 1 && points.some((point) => point.value > 0);
  const max = niceMax(Math.max(...points.map((point) => point.value), 0));
  const maxIndex = points.reduce(
    (best, point, index) => (point.value > points[best].value ? index : best),
    0,
  );

  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const step = points.length > 1 ? (width - PADDING_LEFT * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: PADDING_LEFT + step * index,
    y: PADDING_TOP + plotHeight - (max > 0 ? (point.value / max) * plotHeight : 0),
  }));

  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x},${coord.y}`)
    .join(" ");

  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1].x},${PADDING_TOP + plotHeight} L${coords[0].x},${PADDING_TOP + plotHeight} Z`
      : "";

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {!hasData ? (
        <EmptyPlot />
      ) : width > 0 ? (
        <>
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.series} stopOpacity={0.28} />
                <Stop offset="1" stopColor={theme.series} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            {[0, 0.5, 1].map((ratio) => (
              <Line
                key={ratio}
                x1={0}
                x2={width}
                y1={PADDING_TOP + plotHeight * ratio}
                y2={PADDING_TOP + plotHeight * ratio}
                stroke={theme.grid}
                strokeWidth={1}
              />
            ))}

            <Path d={areaPath} fill="url(#areaFill)" />
            <Path
              d={linePath}
              stroke={theme.series}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {coords.map((coord, index) => {
              const isActive = selected === index || (selected === null && index === maxIndex);
              if (!isActive) return null;

              return (
                <Circle
                  key={`dot-${index}`}
                  cx={coord.x}
                  cy={coord.y}
                  r={5}
                  fill={theme.series}
                  // Anel na cor da superfície separa o marcador da linha.
                  stroke={theme.surface}
                  strokeWidth={2}
                />
              );
            })}
          </Svg>

          <View className="absolute left-0 right-0 flex-row" style={{ height: CHART_HEIGHT }}>
            {points.map((point, index) => (
              <Pressable
                key={`hit-${point.label}-${index}`}
                onPress={() => setSelected(selected === index ? null : index)}
                accessibilityRole="button"
                accessibilityLabel={`${point.label}: ${formatValue(point.value)}`}
                className="flex-1"
              />
            ))}
          </View>

          <View className="mt-1 items-center">
            <Text className="text-xs font-semibold text-ink">
              {selected !== null
                ? `${points[selected].label}: ${formatValue(points[selected].value)}`
                : `Pico: ${points[maxIndex].label} · ${formatValue(points[maxIndex].value)}`}
            </Text>
          </View>

          <XLabels points={points} selected={selected} />
        </>
      ) : null}
    </ChartFrame>
  );
}

export { money as formatMoneyShort };
