// 구글 연동 자리표시 (어댑터 폴더 안에서만 google 을 직접 다룬다. docs/google-integration.md)
// API 키가 없으면 모든 호출이 'unavailable' 코드로 거절되고, 앱은 로컬 소스만으로 정상 동작한다.
import { PlaceSource, SourceError } from './base.js';

const unavailable = (apiKey) => new SourceError('unavailable', apiKey ? '아직 연동 전이에요' : 'API 키가 없어요');
export class GoogleSource extends PlaceSource {
  constructor({ apiKey = null } = {}) { super('google'); this.apiKey = apiKey; }
  async search() { throw unavailable(this.apiKey); }
  async details() { throw unavailable(this.apiKey); }
  async nearby() { throw unavailable(this.apiKey); }
}
