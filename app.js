document.getElementById('input-excel').addEventListener('change', handleFile);
document.getElementById('area-salud').addEventListener('change', updateMunicipioAndServicio);
document.getElementById('municipio').addEventListener('change', filterData);
document.getElementById('servicio-salud').addEventListener('change', filterData);

let mergedData = []; // Store merged data globally

function handleFile(event) {
    const files = event.target.files; // Get the list of files
    const fileReaders = []; // Array to hold FileReader promises

    // Read each file and push the promise to the array
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const fileReaderPromise = new Promise((resolve, reject) => {
            reader.onload = function(event) {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData); // Resolve with the JSON data
            };
            reader.onerror = reject; // Reject on error
            reader.readAsArrayBuffer(file);
        });
        fileReaders.push(fileReaderPromise); // Add the promise to the array
    }

    // Wait for all files to be read and merge the results
    Promise.all(fileReaders).then(results => {
        mergedData = [].concat(...results); // Merge the arrays
        console.log(mergedData); // Log merged data for verification
        populateSelectors(mergedData); // Populate filter selectors
        renderTable(mergedData); // Render the table with merged data
        renderChart(mergedData); // Render the chart with merged data
    }).catch(error => {
        console.error('Error reading files:', error);
    });
}

function populateSelectors(data) {
    const areaSaludSelect = document.getElementById('area-salud');
    const municipioSelect = document.getElementById('municipio');
    const servicioSaludSelect = document.getElementById('servicio-salud');

    const areas = new Set();
    const municipios = new Set();
    const servicios = new Set();

    data.forEach(item => {
        areas.add(item['Área de Salud']);
        municipios.add(item['Municipio']);
        servicios.add(item['Servicio de Salud']);
    });

    areas.forEach(area => {
        areaSaludSelect.add(new Option(area, area));
    });

    municipios.forEach(municipio => {
        municipioSelect.add(new Option(municipio, municipio));
    });

    servicios.forEach(servicio => {
        servicioSaludSelect.add(new Option(servicio, servicio));
    });
}

function updateMunicipioAndServicio() {
    const selectedAreas = Array.from(document.getElementById('area-salud').selectedOptions).map(option => option.value);
    const municipioSelect = document.getElementById('municipio');
    const servicioSelect = document.getElementById('servicio-salud');

    // Clear existing options
    municipioSelect.innerHTML = '<option value="">All</option>';
    servicioSelect.innerHTML = '<option value="">All</option>';

    // Get unique municipios and servicios based on selected areas
    const filteredMunicipios = new Set();
    const filteredServicios = new Set();

    mergedData.forEach(item => {
        if (selectedAreas.includes(item['Área de Salud'])) {
            filteredMunicipios.add(item['Municipio']);
            filteredServicios.add(item['Servicio de Salud']);
        }
    });

    // Populate municipio select
    filteredMunicipios.forEach(municipio => {
        municipioSelect.add(new Option(municipio, municipio));
    });

    // Populate servicio select
    filteredServicios.forEach(servicio => {
        servicioSelect.add(new Option(servicio, servicio));
    });

    // Trigger filtering of data based on the new selections
    filterData();
}

function filterData() {
    console.log("")
    const selectedAreas = Array.from(document.getElementById('area-salud').selectedOptions).map(option => option.value);
    const selectedMunicipios = Array.from(document.getElementById('municipio').selectedOptions).map(option => option.value);
    const selectedServicios = Array.from(document.getElementById('servicio-salud').selectedOptions).map(option => option.value);

    const filteredData = mergedData.filter(item => {
        const areaMatch = selectedAreas.length === 0 || selectedAreas.includes(item['Área de Salud']);
        const municipioMatch = selectedMunicipios.length === 0 || selectedMunicipios.includes(item['Municipio']);
        const servicioMatch = selectedServicios.length === 0 || selectedServicios.includes(item['Servicio de Salud']);
        return areaMatch && municipioMatch && servicioMatch;
    });

    filteredData = filteredData.sort((a, b) => {
        return a.Semana - b.Semana;
    });

    renderTable(filteredData); // Render the table with filtered data
    renderChart(filteredData); // Render the chart with filtered data
}

function renderTable(data) {
    // Define custom column names
    const columnMapping = {
        'Semana': 'Semana',
        'Año': 'Año',
        'Área de Salud': 'Area de Salud',
        'Municipio': 'Municipio',
        'Servicio de Salud': 'Servicio de Salud',
        'Descripción Cie10': 'Descripción',
        'Métrica': 'Numero de casos'
    };

    // Convert the JSON to DataTable format with custom column names
    const columns = Object.keys(data[0]).map(key => ({
        title: columnMapping[key] || key, // Use custom name if available, otherwise use original
        data: key
    }));
    
    const groupedData = data.reduce((acc, item) => {
        const key = `${item.Semana}-${item['Descripción Cie10']}`;
        if (!acc[key]) {
            acc[key] = { ...item, count: 0 }; // Counter for each group
        }
        acc[key].count += 1; // Increment the counter
        return acc;
    }, {});

    // Convert the grouped object back to an array
    const finalData = Object.values(groupedData);

    $('#data-table').DataTable({
        data: finalData,
        columns: columns,
        destroy: true, 
        paging: true,
        searching: true,
        language: {
            search: "Buscar:",
            lengthMenu: "Show _MENU_ entries",
            info: "Mostrando _START_ hasta _END_ de _TOTAL_ resultados",
            paginate: {
                first: "Primera",
                last: "Ultima",
                next: "Siguiente",
                previous: "Anterior"
            }
        }
    });
}


function renderChart(data) {
    // Group the data by 'Descripción Cie10' and week-year
    const groupedData = data.reduce((acc, item) => {
        const desc = item['Descripción Cie10'];
        const weekYear = `${item.Semana.toString().padStart(2, '0')}-${item.Año}`;

        if (!acc[desc]) {
            acc[desc] = {};
        }

        if (!acc[desc][weekYear]) {
            acc[desc][weekYear] = 0;
        }

        acc[desc][weekYear] += item['Métrica'];
        return acc;
    }, {});

    // Get unique week-year combinations and sort them
    const weekYears = [...new Set(data.map(item => `${item.Semana.toString().padStart(2, '0')}-${item.Año}`))].sort();

    // Prepare the traces (lines) for the chart
    const traces = Object.keys(groupedData).map(desc => {
        const x = weekYears;
        const y = weekYears.map(weekYear => groupedData[desc][weekYear] || 0);

        return {
            type: 'scatter',
            mode: 'lines+markers',
            x: x,
            y: y,
            name: desc,
            line: { shape: 'linear' },
        };
    });

    // Configuration of the layout
    const layout = {
        title: 'Tendecia de numero de casos por Semana epidemiologica - Año',
        xaxis: { 
            title: 'Semana epidemiologica - Año',
            tickangle: -45,
            automargin: true
        },
        yaxis: { title: 'Número de casos' },
        hovermode: 'closest',
        legend: {
            orientation: 'h',
            yanchor: 'bottom',
            y: -0.3,
            xanchor: 'center',
            x: 0.5
        },
        margin: {
            b: 150 // Increase bottom margin to accommodate legend
        }
    };

    // Render the chart with Plotly
    Plotly.newPlot('chart', traces, layout);
}

