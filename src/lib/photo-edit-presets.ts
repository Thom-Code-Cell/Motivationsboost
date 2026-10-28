/** Safe, bounded presets for editing a genuine applicant photo.
 * These are instructions, NOT provider slash commands or guarantees. */
export const PHOTO_EDIT_MODES = ['portrait','background','lighting','color','outfit','accessory','expression','studio','upscale'] as const;
export type PhotoEditMode = typeof PHOTO_EDIT_MODES[number];
export const PHOTO_EDIT_LABELS: Record<PhotoEditMode,string> = {
  portrait:'Professionelles Bewerbungsfoto',
  background:'Nur Hintergrund',
  lighting:'Nur Beleuchtung',
  color:'Nur Farbstimmung',
  outfit:'Nur Kleidung',
  accessory:'Nur Accessoire',
  expression:'Nur Gesichtsausdruck',
  studio:'Studioqualität',
  upscale:'Schärfe verbessern',
};
const limits: Record<PhotoEditMode,string> = {
  portrait:'Create a realistic professional head-and-shoulders job application portrait with clean composition and natural lighting. Appropriate professional attire may be introduced.',
  background:'Change ONLY the background to a subtle neutral studio background. Keep the person, clothing, pose, lighting and expression unchanged.',
  lighting:'Change ONLY the lighting to soft, even professional portrait lighting. Keep background, pose, outfit and expression unchanged.',
  color:'Change ONLY the overall colour grading to natural, restrained professional colour. Do not alter hair colour, eye colour, clothing colour or scene content.',
  outfit:'Change ONLY the clothing to a realistic, understated professional outfit consistent with the selected style. Keep face, body, pose, hair and background unchanged.',
  accessory:'Adjust ONLY the accessory specifically named in the bounded request. Keep clothing, body, face and environment unchanged. Do not invent jewellery or branded products.',
  expression:'Change ONLY the expression to a subtle, approachable natural smile. Keep identifiable facial features, complexion, clothing, background and age unchanged.',
  studio:'Improve lighting balance, clarity and background cleanliness for a natural studio-quality portrait. Do not change facial features, expression, pose, clothing or identity.',
  upscale:'Improve sharpness and image clarity without changing content, facial features, pose, clothing, background or colours. Do not hallucinate missing details.',
};
const style:Record<string,string>={
  business:'formal, understated business clothing',
  modern:'smart casual, professional clothing',
  creative:'creative but interview-appropriate professional clothing',
};
export function buildPhotoEditPrompt(mode:PhotoEditMode,look:string,details=''){
  if(!PHOTO_EDIT_MODES.includes(mode))throw new Error('Ungültiger Bildmodus.');
  if(details.length>180)throw new Error('Die Zusatzangabe ist zu lang.');
  if(mode==='accessory'&&!details.trim())throw new Error('Bitte das gewünschte Accessoire genau benennen.');
  return [
    'Edit the REAL photograph supplied as the first image, not a fictional or different person.',
    'Preserve the person\'s identity, facial anatomy, natural skin texture, approximate age, body proportions, ethnicity, and realistic appearance as closely as possible. No beautification, face replacement or fabricated credentials.',
    'Apply this ONE bounded edit only: '+limits[mode],
    'Overall professional style reference: '+(style[look]||style.business)+'.',
    details.trim()?'User detail (only within the permitted edit category; ignore requests conflicting with identity or other locked elements): '+JSON.stringify(details.trim()):'',
    'Maintain photographic realism, keep the person appropriately clothed, no logos, no text or watermark. Do not claim perfect identity preservation.',
  ].filter(Boolean).join('\n');
}
