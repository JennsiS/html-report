import streamlit as st
import pandas as pd
import plotly.graph_objects as go

st.set_page_config(page_title="Reporte de casos de Dengue", layout="wide")

# Function to read specified Excel files
def read_excel_files(file_paths):
    dfs = []
    for file in file_paths:
        df = pd.read_excel(file)
        df = df.drop(columns=['Idcie10'], errors='ignore')  # Ignore if column does not exist
        df = df.rename(columns={'Descripción Cie10': 'Tipo de Dengue', 'Métrica': 'Número de casos'})
        dfs.append(df)
    return pd.concat(dfs, ignore_index=True)

# Function to populate selectors
def populate_selectors(data):
    areas = sorted(data['Área de Salud'].unique())
    municipios = sorted(data['Municipio'].unique())
    servicios = sorted(data['Servicio de Salud'].unique())
    descripciones = sorted(data['Tipo de Dengue'].unique())
    return areas, municipios, servicios, descripciones

# Function to filter data
def filter_data(data, selected_areas, selected_municipios, selected_servicios, selected_descripciones):
    filtered_data = data.copy()
    
    if selected_areas:
        filtered_data = filtered_data[filtered_data['Área de Salud'].isin(selected_areas)]
    if selected_municipios:
        filtered_data = filtered_data[filtered_data['Municipio'].isin(selected_municipios)]
    if selected_servicios:
        filtered_data = filtered_data[filtered_data['Servicio de Salud'].isin(selected_servicios)]
    
    if selected_descripciones and 'Dengue total' in selected_descripciones:
        filtered_data['Tipo de Dengue'] = 'Dengue total'
    elif selected_descripciones:
        filtered_data = filtered_data[filtered_data['Tipo de Dengue'].isin(selected_descripciones)]
    
    return filtered_data.sort_values(['Año', 'Semana'])

# Function to render chart
def render_chart(data):
    # Group data by week and year and sum cases
    grouped_data = data.groupby(['Semana', 'Año', 'Tipo de Dengue']).agg({
        'Número de casos': 'sum'
    }).reset_index()

    grouped_data['Semana'] = grouped_data['Semana'].astype(str).str.zfill(2)

    grouped_data = grouped_data.sort_values(['Año', 'Semana'])

    fig = go.Figure()
    for desc in grouped_data['Tipo de Dengue'].unique():
        df_desc = grouped_data[grouped_data['Tipo de Dengue'] == desc]
        fig.add_trace(go.Scatter(
            x=df_desc['Semana'].astype(str) + '-' + df_desc['Año'].astype(str),
            y=df_desc['Número de casos'],
            mode='lines+markers',
            name=desc
        ))
    
    fig.update_layout(
        title='Número de casos por Semana epidemiológica - Año',
        xaxis_title='Semana epidemiológica - Año',
        yaxis_title='Número de casos',
        legend=dict(
            orientation="v",  
            yanchor="top",
            y=1,  
            xanchor="left",
            x=1.05
        ),
        margin=dict(l=0, r=200)
    )
    return fig

# Streamlit app
st.title('Reporte de casos de Dengue')

# Define file paths
file_paths = ['data/SIGSA_18_Epivigila_año_2023.xlsx', 'data/SIGSA_18_Epivigila_año_2024.xlsx']

# Read data from specified files
data = read_excel_files(file_paths)

# Populate selectors
areas, municipios, servicios, descripciones = populate_selectors(data)

# Create multiselect filters
col1, col2 = st.columns(2)
with col1:
    selected_areas = st.multiselect('Área de Salud', areas)
    selected_servicios = st.multiselect('Servicio de Salud', servicios)
with col2:
    selected_municipios = st.multiselect('Municipio', municipios)
    selected_descripciones = st.multiselect('Tipo de Dengue', ['Dengue total'] + list(descripciones))

# Filter data
filtered_data = filter_data(data, selected_areas, selected_municipios, selected_servicios, selected_descripciones)

# Render chart
st.plotly_chart(render_chart(filtered_data))

# Display data table
st.dataframe(filtered_data)

# Download button for filtered data
csv = filtered_data.to_csv(index=False).encode('utf-8')
st.download_button(
    label="Descargar informe filtrado en CSV",
    data=csv,
    file_name="filtered_data.csv",
    mime="text/csv",
)
