/* eslint-disable */
/* global WebImporter */

/**
 * hero-corporate v10.
 * Hero block: 1 column, 3 rows. Row 1: block name. Row 2: background image. Row 3: heading + text.
 * Source DOM: .mds-heroBanner with video background, h1 overlay text.
 * Since video is not supported as background in EDS hero, we use the video poster/still as image.
 */
export default function parse(element, { document }) {
  // Extract heading from hero banner
  const heading = element.querySelector('h1, h2, [class*="hero--text"]');

  // Extract video source for reference (will be converted to image in import)
  const video = element.querySelector('video source');
  const videoSrc = video ? video.getAttribute('src') : null;

  // Build cells matching hero block library structure:
  // Row 1 (auto): block name
  // Row 2: background image (optional) - use video poster or skip
  // Row 3: heading + subheading + CTA
  const cells = [];

  // Content row: heading and optional description
  const contentCell = [];
  if (heading) contentCell.push(heading);

  // Add video link as reference if available
  if (videoSrc) {
    const videoLink = document.createElement('a');
    videoLink.href = videoSrc;
    videoLink.textContent = videoSrc;
    contentCell.push(videoLink);
  }

  if (contentCell.length > 0) cells.push(contentCell);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-corporate', cells });
  element.replaceWith(block);
}
