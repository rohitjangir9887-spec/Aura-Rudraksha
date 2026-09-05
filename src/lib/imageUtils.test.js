import { describe, it, expect } from 'vitest';
import { getMediaUrl } from './imageUtils.js';

describe('getMediaUrl', () => {
  it('returns empty string if url is falsy', () => {
    expect(getMediaUrl(null)).toBe('');
    expect(getMediaUrl(undefined)).toBe('');
    expect(getMediaUrl('')).toBe('');
  });

  it('returns same url if it starts with http', () => {
    expect(getMediaUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
    expect(getMediaUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
  });

  it('returns same url if it starts with /', () => {
    expect(getMediaUrl('/images/test.jpg')).toBe('/images/test.jpg');
    expect(getMediaUrl('/path/to/media.mp4')).toBe('/path/to/media.mp4');
  });

  it('prepends / to url if it does not start with http or /', () => {
    expect(getMediaUrl('images/test.jpg')).toBe('/images/test.jpg');
    expect(getMediaUrl('path/to/media.mp4')).toBe('/path/to/media.mp4');
  });
});
