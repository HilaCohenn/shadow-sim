import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface DayData {
  day: number;
  date: string;
  month: number;
  peak_area: number;
  total_area_hours: number;
  hours_shaded: number;
}

interface Props {
  data: DayData[];
  metric: "peak_area" | "total_area_hours" | "hours_shaded";
  onDaySelect: (day: DayData) => void;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_START_DAYS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

export default function ShadowHistogram({ data, metric, onDaySelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const totalW = svgRef.current.clientWidth || 800;
    const totalH = svgRef.current.clientHeight || 300;
    const w = totalW - margin.left - margin.right;
    const h = totalH - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([1, 366]).range([0, w]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d[metric]) ?? 1])
      .nice()
      .range([h, 0]);

    // Month bands
    MONTH_START_DAYS.forEach((startDay, i) => {
      const endDay = MONTH_START_DAYS[i + 1] ?? 366;
      g.append("rect")
        .attr("x", x(startDay))
        .attr("width", x(endDay) - x(startDay))
        .attr("y", 0)
        .attr("height", h)
        .attr("fill", i % 2 === 0 ? "#1e1e2e" : "#16213e")
        .attr("opacity", 0.5);
    });

    // Bars
    const barW = Math.max(1, w / data.length - 0.5);
    g.selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.day))
      .attr("width", barW)
      .attr("y", (d) => y(d[metric]))
      .attr("height", (d) => h - y(d[metric]))
      .attr("fill", (d) => d3.interpolateYlOrRd(d[metric] / (d3.max(data, (d2) => d2[metric]) ?? 1)))
      .attr("rx", 1)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 0.7);
        tooltip
          .style("display", "block")
          .html(
            `<strong>${d.date}</strong><br/>
             Peak area: ${d.peak_area} m²<br/>
             Total area·h: ${d.total_area_hours}<br/>
             Hours shaded: ${d.hours_shaded}h`
          )
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY - 60}px`);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 1);
        tooltip.style("display", "none");
      })
      .on("click", (_event, d) => onDaySelect(d));

    // X axis — month labels
    const xAxis = g.append("g").attr("transform", `translate(0,${h})`);
    MONTH_START_DAYS.forEach((startDay, i) => {
      const endDay = MONTH_START_DAYS[i + 1] ?? 366;
      xAxis
        .append("text")
        .attr("x", x((startDay + endDay) / 2))
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#aaa")
        .attr("font-size", 11)
        .text(MONTH_LABELS[i]);
    });
    xAxis.append("line").attr("x2", w).attr("stroke", "#555");

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .call((a) => a.selectAll("text").attr("fill", "#aaa").attr("font-size", 11))
      .call((a) => a.selectAll("line,path").attr("stroke", "#555"));

    // Y label
    const labels: Record<string, string> = {
      peak_area: "Peak shadow area (m²)",
      total_area_hours: "Total shadow area·hours",
      hours_shaded: "Hours shaded per day",
    };
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .attr("fill", "#aaa")
      .attr("font-size", 11)
      .text(labels[metric]);

    // Tooltip
    const tooltip = d3
      .select(svgRef.current.parentElement!)
      .selectAll<HTMLDivElement, unknown>(".tooltip")
      .data([null])
      .join("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#222")
      .style("color", "#eee")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("display", "none");
  }, [data, metric, onDaySelect]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: 300, display: "block" }}
    />
  );
}
