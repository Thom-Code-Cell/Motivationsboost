'use server';
/** Optional, explicitly consented, quota-limited applicant-photo edits via OpenAI.
 * This action is off by default. A reserved attempt is never auto-retried or refunded. */
import { requireSession } from '@/lib/server/session';
import { adminDb } from '@/lib/server/firebase-admin';
import { buildPhotoEditPrompt } from '@/lib/photo-edit-presets';
import {
  GenerateProfessionalPhotoInputSchema,
  GenerateProfessionalPhotoOutputSchema,
  type GenerateProfessionalPhotoInput,
  type GenerateProfessionalPhotoOutput,
} from '@/ai/schemas';

function imageBytes(dataUrl: string) {
  const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('Bitte ein gültiges eigenes JPG-, PNG- oder WebP-Foto hochladen.');
  const bytes=Buffer.from(match[2],'base64');
  const jpg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(bytes.length<100||bytes.length>8_000_000||!(match[1]==='jpeg'&&jpg||match[1]==='png'&&png||match[1]==='webp'&&webp))
    throw new Error('Das Foto ist zu gross oder hat ein ungültiges Format.');
  return { bytes, mime: match[1] };
}
async function reservePhotoAttempt(uid:string){
  const db=adminDb();
  const day=new Date().toISOString().slice(0,10);
  const month=day.slice(0,7);
  const personal=db.doc('photoStudioUsage/'+uid);
  const shared=db.doc('photoStudioUsage/global-'+month);
  // Fixed safety ceilings: <=2 attempts/user/day, <=10 attempts/month globally.
  // Global limit is 0 unless separately enabled in production with a budget review.
  await db.runTransaction(async tx=>{
    const [a,b]=await Promise.all([tx.get(personal),tx.get(shared)]);
    const daily=a.data()?.day===day?Number(a.data()?.count||0):0;
    const global=Number(b.data()?.count||0);
    if(daily>=2||global>=10)throw new Error('Das Bildkontingent ist aufgebraucht.');
    tx.set(personal,{day,count:daily+1},{merge:true});
    tx.set(shared,{month,count:global+1},{merge:true});
  });
}
export async function generateProfessionalPhoto(input:GenerateProfessionalPhotoInput):Promise<GenerateProfessionalPhotoOutput>{
  const parsed=GenerateProfessionalPhotoInputSchema.parse(input);
  if(process.env.PHOTO_STUDIO_ENABLED!=='true')throw new Error('Bild-KI ist aktuell nicht freigegeben.');
  if(!process.env.OPENAI_API_KEY)throw new Error('Der Bilddienst ist nicht konfiguriert.');
  const session=await requireSession();
  if(parsed.consent!==true)throw new Error('Die Einwilligung fehlt.');
  const {bytes,mime}=imageBytes(parsed.userPhoto);
  const prompt=buildPhotoEditPrompt(parsed.mode,parsed.style,parsed.prompt||'');
  await reservePhotoAttempt(session.uid);
  const form=new FormData();
  form.set('model','gpt-image-1');
  form.set('n','1');
  form.set('quality','medium');
  form.set('size','1024x1024');
  form.set('output_format','jpeg');
  form.set('input_fidelity','high');
  form.set('prompt',prompt);
  form.append('image[]',new Blob([new Uint8Array(bytes)],{type:'image/'+mime}),'applicant.'+(mime==='jpeg'?'jpg':mime));
  let response:Response;
  try {
    response=await fetch('https://api.openai.com/v1/images/edits',{
      method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},
      body:form,signal:AbortSignal.timeout(180000),redirect:'error',cache:'no-store'
    });
  }catch{throw new Error('Der Bilddienst antwortet nicht. Der Versuch bleibt reserviert.');}
  if(!response.ok)throw new Error('Die Bildbearbeitung wurde nicht abgeschlossen. Keine automatische Wiederholung.');
  const data=await response.json() as {data?:Array<{b64_json?:string}>};
  const encoded=data.data?.[0]?.b64_json;
  if(!encoded||encoded.length>14_000_000)throw new Error('Der Bilddienst hat kein gültiges Bild geliefert.');
  return GenerateProfessionalPhotoOutputSchema.parse({generatedPhoto:'data:image/jpeg;base64,'+encoded});
}
