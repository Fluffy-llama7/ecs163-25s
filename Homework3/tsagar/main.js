const width = window.innerWidth;
const height = window.innerHeight;

let scatterMargin = { top: 10, right: 30, bottom: 30, left: 60 },
    scatterWidth = 700 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 250 - scatterMargin.top - scatterMargin.bottom;

let barMargin = { top: 10, right: 30, bottom: 30, left: 60 },
    barWidth = width - barMargin.left - barMargin.right - 700,
    barHeight = height - 600 - barMargin.top - barMargin.bottom;

let starLeft = 800, starTop = 100;
let starWidth = 400, starHeight = 400;

let processedData, originalData, g3, g4, x3, y3, radius = 120, angleSlice;
let selectedLabels = new Set();

const legendData = [ //color mapping by product category
  { label: "Moisturizer", color: "#2ecc71" },
  { label: "Cleanser", color: "#3498db" },
  { label: "Treatment", color: "#e74c3c" },
  { label: "Face Mask", color: "#f4d03f" },
  { label: "Eye cream", color: "#f39c12" },
  { label: "Sun protect", color: "#a569bd" }
];
//for legend element

function updateBarChart(data) {
  const labelGroups = {};
  data.forEach(d => {
    if (!labelGroups[d.Label]) labelGroups[d.Label] = { total: 0, count: 0 };
    labelGroups[d.Label].total += d.Price;
    labelGroups[d.Label].count += 1;
  });
  const avgPriceByLabel = Object.entries(labelGroups).map(([label, d]) => ({
    label,
    avgPrice: d.total / d.count
  }));
  //computing average price after processing

  x3.domain(avgPriceByLabel.map(d => d.label));
  g3.select(".x.axis").transition().call(d3.axisBottom(x3));

  y3.domain([0, d3.max(avgPriceByLabel, d => d.avgPrice)]).nice();
  g3.select(".y.axis").transition().call(d3.axisLeft(y3));

  const bars = g3.selectAll("rect.bar").data(avgPriceByLabel, d => d.label);

  bars.enter().append("rect") //rectangle for each bar chart entry
    .attr("class", "bar")
    .attr("x", d => x3(d.label))
    .attr("y", d => y3(d.avgPrice))
    .attr("width", x3.bandwidth())
    .attr("height", d => barHeight - y3(d.avgPrice))
    .attr("fill", d => selectedLabels.has(d.label) ? "#555" : "black")
    .on("click", function(event, d) {
      const isSelected = selectedLabels.has(d.label);
      if (isSelected) {
        selectedLabels.delete(d.label);
      } else {
        selectedLabels.add(d.label);
      }
      d3.select(this).attr("fill", isSelected ? "black" : "#555");
    })
    .merge(bars)
    .transition()
    .attr("x", d => x3(d.label))
    .attr("y", d => y3(d.avgPrice))
    .attr("width", x3.bandwidth())
    .attr("height", d => barHeight - y3(d.avgPrice))
    .attr("fill", d => selectedLabels.has(d.label) ? "#555" : "black");

  bars.exit().remove();
}

function updateStarPlot(data) {
  const ingredientCounts = {};
  data.forEach(d => {
    d.Ingredients.forEach(ing => {
      ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 1;
    });
  });
  //data processing for star plot

  const topIngredients = Object.entries(ingredientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(d => d[0]);

  angleSlice = (2 * Math.PI) / topIngredients.length;
  const types = Array.from(new Set(data.map(d => d.Label)));

  const ingredientPresenceByType = types.map(label => {
    const entries = data.filter(d => d.Label === label);
    const total = entries.length;
    const values = topIngredients.map(ing => {
      const count = entries.filter(d => d.Ingredients.includes(ing)).length;
      return total > 0 ? count / total : 0;
    });
    return { label, values };
  });

  g4.selectAll("path.data-line").remove();
  g4.selectAll("path.grid-line").remove();
  g4.selectAll("text.ingredient-label").remove();

  const levels = 5;
  for (let level = 1; level <= levels; level++) {
    const r = (radius / levels) * level;
    const points = d3.range(topIngredients.length).map(i => {
      const angle = angleSlice * i - Math.PI / 2;
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    });
    g4.append("path")
      .attr("class", "grid-line")
      .attr("d", d3.line()(points.concat([points[0]])))
      .attr("stroke", "#ccc")
      .attr("fill", "none")
      .attr("stroke-width", 0.5);
  }

  topIngredients.forEach((ing, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = Math.cos(angle) * (radius + 20);
    const y = Math.sin(angle) * (radius + 20);
    g4.append("text")
      .attr("class", "ingredient-label")
      .attr("x", x).attr("y", y)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", "10px")
      .text(ing);
  });

  ingredientPresenceByType.forEach(typeData => {
    const color = legendData.find(l => l.label === typeData.label)?.color || "#a569bd";
    const line = d3.lineRadial()
      .radius(d => d * radius)
      .angle((d, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    g4.append("path")
      .datum(typeData.values)
      .attr("class", "data-line")
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);
  });
}//function for creating connected arcs for star plot

let selectedStarLabel = null;

d3.csv("cosmetics.csv").then(rawData => {
  rawData.forEach((d, i) => {
    d.Label = String(d.Label);
    d.Rank = +d.Rank;
    d.Price = +d.Price;
    d.Color = legendData.find(l => l.label === d.Label)?.color || "#a569bd";
    d.id = i;
  });

  processedData = rawData.filter(d => d.Rank > 1 && d.Price < 200).map(d => ({
    ...d,
    Ingredients: d.Ingredients?.split(",").map(s => s.trim().toLowerCase()) || []
  }));
  originalData = [...processedData];

  const svg = d3.select("svg");

  //scatter plot svg element
  const g1 = svg.append("g").attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top + 100})`);
  const x1 = d3.scaleLinear().domain([0, d3.max(processedData, d => d.Price)]).range([0, scatterWidth]);
  const y1 = d3.scaleLinear().domain([1, d3.max(processedData, d => d.Rank)]).range([scatterHeight, 0]);

  g1.append("g").attr("transform", `translate(0, ${scatterHeight})`).call(d3.axisBottom(x1));
  g1.append("g").call(d3.axisLeft(y1));

  g1.append("text").attr("x", scatterWidth / 2).attr("y", scatterHeight + 40).text("Price").attr("text-anchor", "middle");
  g1.append("text").attr("x", -scatterHeight / 2).attr("y", -40).attr("transform", "rotate(-90)").text("Ranking").attr("text-anchor", "middle");
  g1.append("text").attr("x", 400).attr("y", -60).attr("font-size", "24px").text("Effect of Price on Ranking of Cosmetics - Brush Interaction").attr("text-anchor", "middle");

  //circles for each data point on scatter plot, selection functionality for brush
  g1.selectAll("circle")
    .data(processedData)
    .enter().append("circle")
    .attr("cx", d => x1(d.Price))
    .attr("cy", d => y1(d.Rank))
    .attr("r", 2)
    .attr("fill", d => d.Color)
    .style("stroke", "#333")
    .style("stroke-width", 0.5)
    .on("click", function() {
      const selected = d3.select(this).classed("selected");
      d3.select(this)
        .classed("selected", !selected)
        .style("stroke", !selected ? "black" : "#333")
        .style("stroke-width", !selected ? 2 : 0.5);
    });

  //scatter plot legend based on data mappings
  const scatterLegend = svg.append("g")
    .attr("transform", `translate(${scatterMargin.left + scatterWidth + 20}, ${scatterMargin.top + 100})`);

  legendData.forEach((d, i) => {
    const row = scatterLegend.append("g").attr("transform", `translate(0, ${i * 20})`);
    row.append("rect").attr("width", 12).attr("height", 12).attr("fill", d.color);
    row.append("text").attr("x", 20).attr("y", 10).attr("font-size", "12px").text(d.label);
  });

  //brush selection for bar chart
  const brushScatter = d3.brush()
    .extent([[0, 0], [scatterWidth, scatterHeight]])
    .on("end", function(event) {
      const selection = event.selection;
      console.log("Brushed selection:", selection);
    });
  g1.append("g").attr("class", "brush").call(brushScatter);

  //bar chart svg element
  g3 = svg.append("g").attr("transform", `translate(${barMargin.left}, ${600})`);
  x3 = d3.scaleBand().range([0, barWidth]).padding(0.2);
  y3 = d3.scaleLinear().range([barHeight, 0]);

  g3.append("g").attr("class", "x axis").attr("transform", `translate(0, ${barHeight})`);
  g3.append("g").attr("class", "y axis");
  g3.append("text").attr("x", barWidth / 2).attr("y", barHeight + 50).text("Skincare Type").attr("text-anchor", "middle");
  g3.append("text").attr("x", -(barHeight / 2)).attr("y", -40).attr("transform", "rotate(-90)").text("Average Price").attr("text-anchor", "middle");
  g3.append("text").attr("x", barWidth / 2).attr("y", -120).text("Type of Product vs Average Price - Selection interaction").attr("text-anchor", "middle").attr("font-size", "20px");

  //star plot svg element has legend based on data mappings, arcs for each product category, radial lines
  g4 = svg.append("g").attr("transform", `translate(${starLeft + starWidth / 2}, ${starTop + starHeight / 2})`);
  svg.append("text")
    .attr("x", starLeft + starWidth / 2)
    .attr("y", starTop - 20)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Top Ingredients Presence by Product Type - Filter by selecting from legend");

  const legend = g4.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${radius + 90}, ${-radius})`);

  legendData.forEach((d, i) => {
    const row = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`)
      .style("cursor", "pointer")
      .on("click", () => {
        if (selectedStarLabel === d.label) {
          selectedStarLabel = null;
          updateStarPlot(processedData);
        } else {
          selectedStarLabel = d.label;
          updateStarPlot(processedData.filter(item => item.Label === d.label));
        }
      });

    row.append("rect").attr("width", 12).attr("height", 12).attr("fill", d.color);
    row.append("text").attr("x", 20).attr("y", 10).attr("font-size", "12px").text(d.label);
  });

  updateBarChart(processedData);
  updateStarPlot(processedData);
});
