import { describe, expect, it } from 'vitest';
import { PHOTO_EDIT_MODES, buildPhotoEditPrompt } from '../../src/lib/photo-edit-presets';

describe('controlled Bewerbungsfoto edits', () => {
  it('offers only explicitly enumerated edit types', () => {
    expect(PHOTO_EDIT_MODES).toEqual(['portrait','background','lighting','color','outfit','accessory','expression','studio','upscale']);
  });
  it('keeps identity constraints in every photo edit', () => {
    for(const mode of PHOTO_EDIT_MODES){
      const p=buildPhotoEditPrompt(mode,'business',mode==='accessory'?'Brille':'');
      expect(p).toContain('Preserve the person');
      expect(p).toContain('ONE bounded edit only');
    }
  });
  it('limits free text and requires named accessories', () => {
    expect(()=>buildPhotoEditPrompt('accessory','business')).toThrow();
    expect(()=>buildPhotoEditPrompt('background','business','a'.repeat(181))).toThrow();
    expect(buildPhotoEditPrompt('lighting','modern')).toContain('Change ONLY the lighting');
    expect(buildPhotoEditPrompt('upscale','creative')).toContain('Do not hallucinate');
  });
});
