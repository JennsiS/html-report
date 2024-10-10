document.getElementById('input-excel').addEventListener('change', handleFile);
document.getElementById('area-salud').addEventListener('change', filterData);
document.getElementById('municipio').addEventListener('change', filterData);
document.getElementById('servicio-salud').addEventListener('change', filterData);


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

function filterData() {
    const selectedArea = document.getElementById('area-salud').value;
    const selectedMunicipio = document.getElementById('municipio').value;
    const selectedServicio = document.getElementById('servicio-salud').value;

    const filteredData = mergedData.filter(item => {
        return (selectedArea === "" || item['Área de Salud'] === selectedArea) &&
               (selectedMunicipio === "" || item['Municipio'] === selectedMunicipio) &&
               (selectedServicio === "" || item['Servicio de Salud'] === selectedServicio);
    });

    renderTable(filteredData); // Render the table with filtered data
    renderChart(filteredData); // Render the chart with filtered data
}

function renderTable(data) {
    // Convertir el JSON a un formato de DataTable
    const columns = Object.keys(data[0]).map(key => ({ title: key, data: key }));
    
    // Agrupar los datos por 'Semana' y 'Descripción Cie10'
    const groupedData = data.reduce((acc, item) => {
        const key = `${item.Semana}-${item['Descripción Cie10']}`;
        if (!acc[key]) {
            acc[key] = { ...item, count: 0 }; // Contador para cada grupo
        }
        acc[key].count += 1; // Incrementar el contador
        return acc;
    }, {});

    // Convertir el objeto agrupado de nuevo a un array
    const finalData = Object.values(groupedData);

    $('#data-table').DataTable({
        data: finalData,
        columns: columns,
        destroy: true,  // Para resetear la tabla si ya existe
        paging: true,
        searching: true
    });
}

function renderChart(data) {
    // Agrupar los datos por 'Semana' y 'Descripción Cie10'
    const groupedData = data.reduce((acc, item) => {
        const key = item.Semana;
        if (!acc[key]) {
            acc[key] = {};
        }
        if (!acc[key][item['Descripción Cie10']]) {
            acc[key][item['Descripción Cie10']] = 0;
        }
        acc[key][item['Descripción Cie10']] += 1; // Contar ocurrencias
        return acc;
    }, {});

    // Preparar los datos para el gráfico
    const traces = [];
    Object.keys(groupedData).forEach(semana => {
        Object.keys(groupedData[semana]).forEach(desc => {
            const xValues = [];
            const yValues = [];
            xValues.push(semana);
            yValues.push(groupedData[semana][desc]);
            traces.push({
                x: xValues,
                y: yValues,
                mode: 'scatter',
                name: desc // Nombre de la serie
            });
        });
    });

    const layout = {
        title: 'Gráfico de Tendencia por Semana',
        xaxis: { title: 'Semana' },
        yaxis: { title: 'Conteo' }
    };

    Plotly.newPlot('chart', traces, layout);
}

// Automatically load two files and merge their contents

