import {LeaderboardAPI} from './api.mjs?v=pf3-1';
import {API_URL} from './config.mjs?v=pf3-1';
import {utcDay} from './rules.mjs?v=pf3-1';
const $=id=>document.getElementById(id),api=new LeaderboardAPI(API_URL);
let generation=0,loaded=false,day=utcDay();
function update() {
  const today=utcDay();day=today;
  $('archiveDay').min=utcDay(Date.now()-29*86400000);$('archiveDay').max=today;
  if(!$('archiveDay').value||$('archiveDay').value<$('archiveDay').min||$('archiveDay').value>today)$('archiveDay').value=today;
  const daily=$('archiveMode').value==='daily';$('archiveDayChoice').hidden=!daily;
  $('archiveExplanation').textContent=daily?`Nur Daily pf-2 vom ${$('archiveDay').value} UTC. Tageswechsel 00:00 UTC; keine normalen Runs.`:'Normale pf-2-Runs aller Tage innerhalb der Aufbewahrungsfrist. Keine Daily-Runs.';
}
function changed(){generation++;$('archiveEntries').replaceChildren();update();$('archiveStatus').textContent='Auswahl geändert. Alte Wertung bewusst laden.';}
$('archiveMode').addEventListener('change',changed);$('archiveDay').addEventListener('change',changed);
$('archiveForm').addEventListener('submit',async event=>{
  event.preventDefault();update();const own=++generation,mode=$('archiveMode').value,chosen=mode==='daily'?$('archiveDay').value:'';
  $('archiveStatus').textContent='Alte Wertung lädt …';$('archiveEntries').replaceChildren();$('loadArchive').disabled=true;
  try{
    const data=await api.list(mode,null,'pf-2',chosen);
    if(own!==generation)return;
    $('archiveStatus').textContent=`Alte Wertung pf-2 · ${mode==='daily'?data.day+' UTC':'NORMAL · ALLZEIT'} · ${data.entries.length?'Top 20':'keine Einträge'}`;
    for(const e of data.entries){const li=document.createElement('li');li.textContent=`${e.position}. ${e.alias} · ${e.score} · ${e.rank} · ${new Date(e.achievedAt).toISOString().slice(0,16).replace('T',' ')} UTC`;$('archiveEntries').append(li);}
    loaded=true;
  }catch(error){if(own===generation)$('archiveStatus').textContent=`Archiv nicht verfügbar: ${error.message}`;}
  finally{$('loadArchive').disabled=false;}
});
update();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&utcDay()!==day){changed();if(loaded)$('archiveStatus').textContent='Neuer UTC-Tag. Archivtag prüfen und bewusst laden.';}});
