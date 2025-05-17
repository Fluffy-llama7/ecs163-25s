let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = 700 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 250 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 100;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 650 - distrMargin.left - distrMargin.right,
    distrHeight = 450 - distrMargin.top - distrMargin.bottom;

let barLeft = 0, barTop = 400;
let barMargin = {top: 10, right: 30, bottom: 30, left: 60},
    barWidth = width - barMargin.left - barMargin.right - 700,
    barHeight = height-600 - barMargin.top - barMargin.bottom;

let starLeft = 800, starTop = 100;
let starWidth = 400, starHeight = 400;

// process
d3.csv("cosmetics.csv").then(rawData =>{
    rawData.forEach(function(d){
        d.Label = String(d.Label);
        d.Rank = Number(d.Rank);
        d.Price = Number(d.Price);
        d.Color = String("");

        switch(d.Label){
            case "Moisturizer": d.Color = "#2ecc71"; break;
            case "Cleanser": d.Color = "#3498db"; break;
            case "Treatment": d.Color = "#e74c3c"; break;
            case "Face Mask": d.Color = "#f4d03f"; break;
            case "Eye Cream": d.Color = "#f39c12"; break;
            case "Sun Protect": d.Color = "#a569bd"; break;
            default: d.Color = "#a569bd";
        }
    });

    const filteredData = rawData.filter(d=>d.Rank>1 && d.Price < 200);
    const processedData = filteredData.map(d=>{
        return {
            Label: d.Label,
            Rank: d.Rank,
            Price: d.Price,
            Color: d.Color,
            Ingredients: d.Ingredients?.split(",")?.map(s => s.trim().toLowerCase()) || []
        };
    });

    const svg = d3.select("svg");

    //Scatter Plot svg elements
    const g1 = svg.append("g")
        .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top + 100})`);

    const x1 = d3.scaleLinear().domain([0, d3.max(processedData, d => d.Price)]).range([0, scatterWidth]);
    const y1 = d3.scaleLinear().domain([1, d3.max(processedData, d => d.Rank)]).range([scatterHeight, 0]);

    g1.append("g").attr("transform", `translate(0, ${scatterHeight})`).call(d3.axisBottom(x1).ticks(7));
    g1.append("g").call(d3.axisLeft(y1).ticks(13));

    g1.append("text").attr("x", scatterWidth / 2).attr("y", scatterHeight + 40).attr("text-anchor", "middle").text("Price");
    g1.append("text").attr("x", -scatterHeight/2).attr("y", -40).attr("transform", "rotate(-90)").attr("text-anchor", "middle").text("Ranking");
    g1.append("text").attr("x", 400).attr("y", -60).attr("text-anchor", "middle").attr("font-size", "24px").text("Effect of Price on Ranking of Cosmetics");
    g1.append("text").attr("x", 1000).attr("y", -60).attr("text-anchor", "middle").attr("font-size", "24px").text("Frequency of Top 10 Most Common Ingredients");
    //title and labels added as text elements

    g1.selectAll("circle")
        .data(processedData)
        .enter().append("circle")
        .attr("cx", d => x1(d.Price))
        .attr("cy", d => y1(d.Rank))
        .attr("r", 2).attr("fill", d => d.Color);
    //points on scatter chart, position determined by price and rank, color determined by product type

    // Bar Chart
    const labelGroups = {};
    processedData.forEach(d => {
        if (!labelGroups[d.Label]) labelGroups[d.Label] = { total: 0, count: 0 };
        labelGroups[d.Label].total += d.Price;
        labelGroups[d.Label].count += 1;
    });
    //labelling for each category

    const avgPriceByLabel = Object.entries(labelGroups).map(([label, data]) => ({
        label: label,
        avgPrice: data.total / data.count
    }));
    //amounts for each category

    const g3 = svg.append("g")
        .attr("transform", `translate(${barMargin.left}, ${barTop + 150})`);
    //bar chart svg element

    const x3 = d3.scaleBand().domain(avgPriceByLabel.map(d => d.label)).range([0, barWidth]).padding(0.3);
    const y3 = d3.scaleLinear().domain([0, d3.max(avgPriceByLabel, d => d.avgPrice)]).range([barHeight, 0]).nice();
    //chart structure

    g3.append("g").attr("transform", `translate(0, ${barHeight})`).call(d3.axisBottom(x3));
    g3.append("g").call(d3.axisLeft(y3));
    //axis location

    g3.append("text").attr("x", barWidth / 2).attr("y", barHeight + 50).attr("text-anchor", "middle").text("Skincare Type");
    g3.append("text").attr("x", -(barHeight / 2)).attr("y", -40).attr("transform", "rotate(-90)").attr("text-anchor", "middle").text("Average Price");
    g3.append("text").attr("x", barWidth / 2).attr("y", -120).attr("text-anchor", "middle").attr("font-size", "20px").text("Type of Product vs Average Price");
    //text svg elements

    g3.selectAll("rect")
        .data(avgPriceByLabel)
        .enter().append("rect")
        .attr("x", d => x3(d.label))
        .attr("y", d => y3(d.avgPrice))
        .attr("width", x3.bandwidth())
        .attr("height", d => barHeight - y3(d.avgPrice))
        .attr("fill", "black");
    //rectangles sized based on price, no need for legend since no color coding is used

    // Star Plot
    const ingredientCounts = {};
    processedData.forEach(d => {
        d.Ingredients.forEach(ing => {
            ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 1;
        });
    });
    //parse through data to get ingredient frequencies

    const topIngredients = Object.entries(ingredientCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(d => d[0]);

    const types = Array.from(new Set(processedData.map(d => d.Label)));
    //put ingredients in array

    const ingredientPresenceByType = types.map(label => {
        const entries = processedData.filter(d => d.Label === label);
        const total = entries.length;
        const values = topIngredients.map(ing => {
            const count = entries.filter(d => d.Ingredients.includes(ing)).length;
            return count / total;
        });
        return { label, values };
    });

    const g4 = svg.append("g")
        .attr("transform", `translate(${starLeft + starWidth / 2}, ${starTop + starHeight / 2})`);
    //star chart svg element

    const radius = 120;
    const angleSlice = (2 * Math.PI) / topIngredients.length;

    topIngredients.forEach((ing, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = Math.cos(angle) * (radius + 20);
        const y = Math.sin(angle) * (radius + 20);
        g4.append("text")
            .attr("x", x).attr("y", y)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("font-size", "10px")
            .text(ing);
    });
    //ingredient labels around outside of chart

    const legendData = [
        { label: "Moisturizer", color: "#2ecc71" },
        { label: "Cleanser", color: "#3498db" },
        { label: "Treatment", color: "#e74c3c" },
        { label: "Face Mask", color: "#f4d03f" },
        { label: "Eye Cream", color: "#f39c12" },
        { label: "Sun Protect", color: "#a569bd" }
    ];
    //color coded legend

    //draw concentric star grid lines using curves
const levels = 5;
for (let level = 1; level <= levels; level++) {
    const r = (radius / levels) * level;
    const points = d3.range(topIngredients.length).map(i => {
        const angle = angleSlice * i - Math.PI / 2;
        return [
            Math.cos(angle) * r,
            Math.sin(angle) * r
        ];
    });

    g4.append("path")
        .attr("d", d3.line()(points.concat([points[0]]))) // close the loop
        .attr("stroke", "#ccc")
        .attr("fill", "none")
        .attr("stroke-width", 0.5);
    //add path element to close the loops on the star chart
}

    ingredientPresenceByType.forEach((typeData, i) => {
        const color = legendData.find(l => l.label === typeData.label)?.color || "#a569bd";
        const line = d3.lineRadial()
            .radius((d, i) => d * radius)
            .angle((d, i) => i * angleSlice)
            .curve(d3.curveLinearClosed);

        g4.append("path")
            .datum(typeData.values)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("d", line);
            
    });
    //svg element to add the star chart lines from each type of product with proper color



    const legend = g4.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${radius + 90}, ${-radius})`);

    legendData.forEach((d, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);
        row.append("rect")
            .attr("width", 12).attr("height", 12).attr("fill", d.color);
        row.append("text")
            .attr("x", 20).attr("y", 10).attr("font-size", "12px")
            .attr("fill", "black").text(d.label);
    });
    //add legend using color array and colored rectangles with text

    const legend2 = g4.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${radius - 400}, ${-radius})`);
    //legend element

legendData.forEach((d, i) => {
    const row = legend2.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
    row.append("rect")
        .attr("width", 12).attr("height", 12).attr("fill", d.color);
    row.append("text")
        .attr("x", 20).attr("y", 10).attr("font-size", "12px")
        .attr("fill", "black").text(d.label);
    //duplicate legend since same colors are used for scatter plot and star plot
});
});