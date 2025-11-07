import { fetchAdvices, fetchRecipes, fetchWeights, fetchPhotos } from './api.js';

const weightChartEl = document.getElementById('weightChart').getContext('2d');
let photos = []; // Array foto per overlay
let weightChart;

// Tooltip personalizzato per mostrare foto
const photoTooltip = document.createElement('div');
photoTooltip.style.position = 'absolute';
photoTooltip.style.pointerEvents = 'none';
photoTooltip.style.background = 'rgba(0,0,0,0.7)';
photoTooltip.style.borderRadius = '8px';
photoTooltip.style.padding = '5px';
photoTooltip.style.display = 'none';
photoTooltip.style.zIndex = 1000;
document.body.appendChild(photoTooltip);

const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => document.body.classList.toggle('dark'));

const langBtn = document.getElementById('langToggle');
langBtn.addEventListener('click', () => {
    document.documentElement.lang = document.documentElement.lang === 'it' ? 'en' : 'it';
});

// --- CARICAMENTO DATI ---
async function initDashboard(){
    const advices = await fetchAdvices();
    const recipes = await fetchRecipes();
    const weights = await fetchWeights();
    photos = await fetchPhotos();

    document.getElementById('advicesList').innerHTML = advices.map(a => `<p>${a.text}</p>`).join('');
    document.getElementById('recipesList').innerHTML = recipes.map(r => `<p>${r.text}</p>`).join('');

    weightChart = new Chart(weightChartEl, {
        type:'line',
        data:{
            labels: weights.map(w=>w.date),
            datasets:[{
                label:'Peso',
                data: weights.map(w=>w.value),
                borderColor:'blue',
                fill:false,
                tension:0.3,
                pointRadius:6,
                pointHoverRadius:10
            }]
        },
        options:{
            responsive:true,
            plugins:{
                legend:{ display:true },
                tooltip:{
                    enabled:false,
                    external: context => {
                        const tooltipModel = context.tooltip;
                        if(tooltipModel.opacity === 0){ photoTooltip.style.display='none'; return; }
                        const idx = tooltipModel.dataPoints[0].dataIndex;
                        if(!photos[idx]) return;
                        const pos = tooltipModel.caretX + tooltipModel.chart.canvas.offsetLeft;
                        const posY = tooltipModel.caretY + tooltipModel.chart.canvas.offsetTop;
                        photoTooltip.innerHTML = `<img src="https://gino.personaltrainergustavo1.workers.dev/photo/${photos[idx].key}" style="width:80px;height:80px;border-radius:8px;">`;
                        photoTooltip.style.left = `${pos + 10}px`;
                        photoTooltip.style.top = `${posY - 40}px`;
                        photoTooltip.style.display='block';
                    }
                }
            }
        }
    });
}
initDashboard();

// --- MODAL FOTO INTERATTIVO ---
let isDragging = false, startX, startY, currentX=0, currentY=0, scale=1;
const photoModal = document.getElementById("photoModal");
const modalPhoto = document.getElementById("modalPhoto");
const modalInner = document.querySelector(".modal-inner");
const closeBtn = document.querySelector(".closeBtn");

function openPhotoModal(photoKey){
    modalPhoto.src = `https://gino.personaltrainergustavo1.workers.dev/photo/${photoKey}`;
    scale=1; currentX=0; currentY=0;
    modalPhoto.style.transform=`translate(0px,0px) scale(1)`;
    photoModal.style.display='flex';
}

// Drag/Swipe
modalPhoto.addEventListener("mousedown", e=>{ isDragging=true; startX=e.clientX-currentX; startY=e.clientY-currentY; modalPhoto.style.cursor="grabbing"; });
modalPhoto.addEventListener("mousemove", e=>{ if(!isDragging)return; currentX=e.clientX-startX; currentY=e.clientY-startY; modalPhoto.style.transform=`translate(${currentX}px,${currentY}px) scale(${scale})`; });
modalPhoto.addEventListener("mouseup", ()=>{ isDragging=false; modalPhoto.style.cursor="grab"; });
modalPhoto.addEventListener("mouseleave", ()=>{ isDragging=false; modalPhoto.style.cursor="grab"; });
modalPhoto.addEventListener("wheel", e=>{ e.preventDefault(); scale+=e.deltaY*-0.001; scale=Math.min(Math.max(0.5,scale),3); modalPhoto.style.transform=`translate(${currentX}px,${currentY}px) scale(${scale})`; });

// Touch
modalPhoto.addEventListener("touchstart", e=>{ if(e.touches.length===1){ isDragging=true; startX=e.touches[0].clientX-currentX; startY=e.touches[0].clientY-currentY; }});
modalPhoto.addEventListener("touchmove", e=>{ if(!isDragging)return; currentX=e.touches[0].clientX-startX; currentY=e.touches[0].clientY-startY; modalPhoto.style.transform=`translate(${currentX}px,${currentY}px) scale(${scale})`; });
modalPhoto.addEventListener("touchend", ()=>{ isDragging=false; });

// Chiudi modal
closeBtn.addEventListener("click", ()=>{ photoModal.style.display='none'; });
photoModal.addEventListener("click", e=>{ if(e.target===photoModal)photoModal.style.display='none'; });

// Click grafico apre modal
weightChartEl.canvas.addEventListener("click", e=>{
    const points = weightChart.getElementsAtEventForMode(e,'nearest',{intersect:true},true);
    if(points.length){
        const idx = points[0].index;
        if(photos[idx]) openPhotoModal(photos[idx].key);
    }
});
