export class ARService {
  static isPublishable(assetUrls: Array<string | null | undefined>) {
    return assetUrls.some(Boolean);
  }
}
