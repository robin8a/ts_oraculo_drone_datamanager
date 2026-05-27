import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fromArrayBuffer, Pool } from 'geotiff';
import type { S3Connection } from '../../services/s3Service';
import { getImageUrl } from '../../services/s3Service';

interface ImagePreviewModalProps {
  s3Connection: S3Connection;
  isOpen: boolean;
  onClose: () => void;
  imageKey: string;
  imageName: string;
}

export function ImagePreviewModal({
  s3Connection,
  isOpen,
  onClose,
  imageKey,
  imageName,
}: ImagePreviewModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isTiffPreview = imageName.toLowerCase().endsWith('.tif') || imageName.toLowerCase().endsWith('.tiff');

  const [tiffMeta, setTiffMeta] = useState<{
    width: number;
    height: number;
    bandCount: number;
    nodata: number | null;
    bands: Float32Array[];
  } | null>(null);
  const [displayMode, setDisplayMode] = useState<'rgb' | 'single'>('single');
  const [rgbBands, setRgbBands] = useState<{ r: number; g: number; b: number }>({
    r: 0,
    g: 1,
    b: 2,
  });
  const [singleBand, setSingleBand] = useState(0);
  const [stretchMode, setStretchMode] = useState<'minmax' | 'percentile'>('percentile');
  const [palette, setPalette] = useState<'gray' | 'fire' | 'vegetation' | 'viridis' | 'firemask'>('gray');
  const [percentileLow, setPercentileLow] = useState(2);
  const [percentileHigh, setPercentileHigh] = useState(98);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const MAX_DISPLAY_SIZE = 1600;
  const MAX_PERCENTILE_SAMPLES = 200_000;
  const EPS = 1e-9;
  const MIN_ZOOM = 0.2;
  const MAX_ZOOM = 12;

  const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

  const scaleToByte = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    if (max - min <= EPS) {
      return 0;
    }
    const normalized = clamp01((value - min) / (max - min));
    return Math.round(normalized * 255);
  };

  const isNoData = (value: number, noData: number | null): boolean =>
    noData !== null && Number.isFinite(noData) && Math.abs(value - noData) < EPS;

  const bandMinMax = (band: ArrayLike<number>, noData: number | null): { min: number; max: number } => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < band.length; i += 1) {
      const value = Number(band[i]);
      if (!Number.isFinite(value) || isNoData(value, noData)) {
        continue;
      }
      if (value < min) min = value;
      if (value > max) max = value;
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 1 };
    }
    return { min, max };
  };

  const bandPercentiles = (
    band: ArrayLike<number>,
    lowPct: number,
    highPct: number,
    noData: number | null
  ): { min: number; max: number } => {
    const rawLow = Math.min(lowPct, highPct);
    const rawHigh = Math.max(lowPct, highPct);
    const low = clamp01(rawLow / 100);
    const high = clamp01(rawHigh / 100);
    const values: number[] = [];
    const stride = Math.max(1, Math.ceil(band.length / MAX_PERCENTILE_SAMPLES));
    for (let i = 0; i < band.length; i += stride) {
      const value = Number(band[i]);
      if (!Number.isFinite(value) || isNoData(value, noData)) {
        continue;
      }
      values.push(value);
    }
    if (values.length === 0) {
      return { min: 0, max: 1 };
    }
    values.sort((a, b) => a - b);
    const lowIndex = Math.floor((values.length - 1) * low);
    const highIndex = Math.floor((values.length - 1) * high);
    const min = values[lowIndex];
    const max = values[Math.max(lowIndex, highIndex)];
    if (!Number.isFinite(min) || !Number.isFinite(max) || max - min <= EPS) {
      return bandMinMax(band, noData);
    }
    return { min, max };
  };

  const getRange = (
    band: ArrayLike<number>,
    mode: 'minmax' | 'percentile',
    lowPct: number,
    highPct: number,
    noData: number | null
  ): { min: number; max: number } => {
    if (mode === 'minmax') {
      return bandMinMax(band, noData);
    }
    return bandPercentiles(band, lowPct, highPct, noData);
  };

  const interpolateColor = (
    value: number,
    stops: Array<{ t: number; rgb: [number, number, number] }>
  ): [number, number, number] => {
    const x = clamp01(value);
    for (let i = 1; i < stops.length; i += 1) {
      const a = stops[i - 1];
      const b = stops[i];
      if (x <= b.t) {
        const den = b.t - a.t || 1;
        const local = (x - a.t) / den;
        return [
          Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * local),
          Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * local),
          Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * local),
        ];
      }
    }
    return stops[stops.length - 1].rgb;
  };

  const singleBandPalette = (
    value: number,
    kind: 'gray' | 'fire' | 'vegetation' | 'viridis' | 'firemask',
    rawValue?: number
  ): [number, number, number] => {
    if (kind === 'firemask' && Number.isFinite(rawValue)) {
      const c = Math.round(rawValue as number);
      if (c === 3) return [0, 0, 255];
      if (c === 4) return [190, 190, 190];
      if (c === 5) return [0, 128, 0];
      if (c === 6) return [255, 255, 0];
      if (c === 7) return [255, 165, 0];
      if (c === 8) return [255, 0, 0];
      if (c === 9) return [139, 0, 0];
      return [40, 40, 40];
    }
    const v = clamp01(value);
    if (kind === 'gray') {
      const g = Math.round(v * 255);
      return [g, g, g];
    }
    if (kind === 'fire') {
      return interpolateColor(v, [
        { t: 0, rgb: [16, 12, 42] },
        { t: 0.2, rgb: [74, 29, 98] },
        { t: 0.45, rgb: [168, 46, 93] },
        { t: 0.65, rgb: [227, 89, 51] },
        { t: 0.82, rgb: [249, 160, 63] },
        { t: 1, rgb: [255, 236, 165] },
      ]);
    }
    if (kind === 'vegetation') {
      return interpolateColor(v, [
        { t: 0, rgb: [120, 72, 45] },
        { t: 0.33, rgb: [176, 148, 83] },
        { t: 0.66, rgb: [116, 173, 96] },
        { t: 1, rgb: [22, 93, 57] },
      ]);
    }
    return interpolateColor(v, [
      { t: 0, rgb: [68, 1, 84] },
      { t: 0.25, rgb: [59, 82, 139] },
      { t: 0.5, rgb: [33, 145, 140] },
      { t: 0.75, rgb: [94, 201, 98] },
      { t: 1, rgb: [253, 231, 37] },
    ]);
  };

  const shouldUseFireMaskPalette = (band: Float32Array): boolean => {
    const sampleCount = Math.min(band.length, 30000);
    const step = Math.max(1, Math.floor(band.length / sampleCount));
    const classes = new Set<number>();
    let integerLike = 0;
    let valid = 0;
    for (let i = 0; i < band.length; i += step) {
      const value = band[i];
      if (!Number.isFinite(value)) continue;
      valid += 1;
      const rounded = Math.round(value);
      if (Math.abs(value - rounded) < 1e-6) {
        integerLike += 1;
      }
      if (rounded >= 0 && rounded <= 20) {
        classes.add(rounded);
      }
    }
    if (valid === 0) return false;
    const integerRatio = integerLike / valid;
    const hasFireClasses = classes.has(7) || classes.has(8) || classes.has(9);
    return integerRatio > 0.95 && hasFireClasses;
  };

  const renderTiffToCanvas = (): void => {
    if (!tiffMeta) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    canvas.width = tiffMeta.width;
    canvas.height = tiffMeta.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo preparar el canvas para TIFF');
    }

    const imageData = context.createImageData(tiffMeta.width, tiffMeta.height);
    const data = imageData.data;
    if (displayMode === 'rgb' && tiffMeta.bandCount >= 3) {
      const rBand = tiffMeta.bands[rgbBands.r] ?? tiffMeta.bands[0];
      const gBand = tiffMeta.bands[rgbBands.g] ?? tiffMeta.bands[Math.min(1, tiffMeta.bandCount - 1)];
      const bBand = tiffMeta.bands[rgbBands.b] ?? tiffMeta.bands[Math.min(2, tiffMeta.bandCount - 1)];
      const rRange = getRange(rBand, stretchMode, percentileLow, percentileHigh, tiffMeta.nodata);
      const gRange = getRange(gBand, stretchMode, percentileLow, percentileHigh, tiffMeta.nodata);
      const bRange = getRange(bBand, stretchMode, percentileLow, percentileHigh, tiffMeta.nodata);
      for (let i = 0, j = 0; i < rBand.length; i += 1, j += 4) {
        const rv = Number(rBand[i]);
        const gv = Number(gBand[i]);
        const bv = Number(bBand[i]);
        const invalid =
          !Number.isFinite(rv) ||
          !Number.isFinite(gv) ||
          !Number.isFinite(bv) ||
          isNoData(rv, tiffMeta.nodata) ||
          isNoData(gv, tiffMeta.nodata) ||
          isNoData(bv, tiffMeta.nodata);
        if (invalid) {
          data[j] = 0;
          data[j + 1] = 0;
          data[j + 2] = 0;
          data[j + 3] = 0;
          continue;
        }
        data[j] = scaleToByte(rv, rRange.min, rRange.max);
        data[j + 1] = scaleToByte(gv, gRange.min, gRange.max);
        data[j + 2] = scaleToByte(bv, bRange.min, bRange.max);
        data[j + 3] = 255;
      }
    } else {
      const band = tiffMeta.bands[singleBand] ?? tiffMeta.bands[0];
      const range = getRange(band, stretchMode, percentileLow, percentileHigh, tiffMeta.nodata);
      for (let i = 0, j = 0; i < band.length; i += 1, j += 4) {
        const value = Number(band[i]);
        if (!Number.isFinite(value) || isNoData(value, tiffMeta.nodata)) {
          data[j] = 0;
          data[j + 1] = 0;
          data[j + 2] = 0;
          data[j + 3] = 0;
          continue;
        }
        const normalized = clamp01((value - range.min) / ((range.max - range.min) || 1));
        const [r, g, b] = singleBandPalette(normalized, palette, value);
        data[j] = r;
        data[j + 1] = g;
        data[j + 2] = b;
        data[j + 3] = 255;
      }
    }
    context.putImageData(imageData, 0, 0);
    setRendering(false);
  };

  const clampZoom = (value: number): number => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));

  const fitToViewport = (): void => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    const contentWidth = isTiffPreview
      ? (tiffMeta?.width ?? 0)
      : (imageRef.current?.naturalWidth ?? imageRef.current?.clientWidth ?? 0);
    const contentHeight = isTiffPreview
      ? (tiffMeta?.height ?? 0)
      : (imageRef.current?.naturalHeight ?? imageRef.current?.clientHeight ?? 0);

    if (contentWidth <= 0 || contentHeight <= 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const fitScale = Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight);
    setZoom(clampZoom(fitScale));
    setPan({ x: 0, y: 0 });
  };

  const resetViewTransform = (): void => {
    fitToViewport();
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
    setLastPanPoint(null);
  };

  const adjustZoom = (factor: number): void => {
    setZoom((prev) => clampZoom(prev * factor));
  };

  const handleWheelZoom = (event: React.WheelEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    adjustZoom(factor);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (zoom <= 1) {
      return;
    }
    event.preventDefault();
    setIsPanning(true);
    setLastPanPoint({ x: event.clientX, y: event.clientY });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!isPanning || !lastPanPoint) {
      return;
    }
    const dx = event.clientX - lastPanPoint.x;
    const dy = event.clientY - lastPanPoint.y;
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastPanPoint({ x: event.clientX, y: event.clientY });
  };

  const stopPanning = (): void => {
    setIsPanning(false);
    setLastPanPoint(null);
  };

  const loadTiffData = async (url: string): Promise<void> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('No se pudo descargar el TIFF para previsualizar');
    }
    const buffer = await response.arrayBuffer();
    const tiff = await fromArrayBuffer(buffer);
    const image = await tiff.getImage();
    const sourceWidth = image.getWidth();
    const sourceHeight = image.getHeight();
    const scale = Math.min(1, MAX_DISPLAY_SIZE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const sampleCount = image.getSamplesPerPixel();
    const nodataRaw = image.getGDALNoData();
    const nodata =
      typeof nodataRaw === 'number'
        ? nodataRaw
        : typeof nodataRaw === 'string'
          ? Number.parseFloat(nodataRaw)
          : null;
    const pool = new Pool();
    try {
      const samples = Array.from({ length: sampleCount }, (_, index) => index);
      const rasters = await image.readRasters({
        samples,
        width,
        height,
        interleave: false,
        pool,
      });
      const bands = rasters.map((band) => {
        if (band instanceof Float32Array) return band;
        const floatBand = new Float32Array(band.length);
        for (let i = 0; i < band.length; i += 1) {
          floatBand[i] = Number(band[i]);
        }
        return floatBand;
      });
      setTiffMeta({
        width,
        height,
        bandCount: sampleCount,
        nodata: Number.isFinite(nodata ?? Number.NaN) ? (nodata as number) : null,
        bands,
      });
      if (sampleCount >= 3) {
        setDisplayMode('rgb');
        setRgbBands({ r: 0, g: 1, b: 2 });
      } else {
        setDisplayMode('single');
      }
      setSingleBand(0);
      const filename = imageName.toLowerCase();
      const likelyFireMaskName =
        filename.includes('firemask') || filename.includes('incend') || filename.includes('fmask');
      const band0 = bands[0];
      const looksLikeFireMask = likelyFireMaskName || shouldUseFireMaskPalette(band0);
      setPalette(looksLikeFireMask ? 'firemask' : 'gray');
      setStretchMode('percentile');
      setPercentileLow(1);
      setPercentileHigh(99);
    } finally {
      await pool.destroy();
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (isOpen && imageKey) {
      setLoading(true);
      setError(null);
      setTiffMeta(null);
      resetViewTransform();
      getImageUrl(s3Connection, imageKey)
        .then(async (url) => {
          if (cancelled) return;
          setImageUrl(url);
          if (isTiffPreview) {
            await loadTiffData(url);
          }
          if (cancelled) return;
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setError('No se pudo cargar la imagen');
          setLoading(false);
        });
    } else {
      setImageUrl(null);
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, imageKey, s3Connection, isTiffPreview]);

  useEffect(() => {
    if (!isOpen || !isTiffPreview || !tiffMeta) {
      return;
    }
    renderTiffToCanvas();
  }, [
    isOpen,
    isTiffPreview,
    tiffMeta,
    displayMode,
    rgbBands.r,
    rgbBands.g,
    rgbBands.b,
    singleBand,
    stretchMode,
    percentileLow,
    percentileHigh,
    palette,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (isTiffPreview && tiffMeta) {
      fitToViewport();
    }
  }, [isOpen, isTiffPreview, tiffMeta]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="mask fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa de imagen"
    >
      <div
        className="h-[92vh] w-[88vw] max-w-[1450px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mx-auto flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/95 shadow-[0_35px_100px_rgba(0,0,0,0.55)] ring-1 ring-black/5">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 rounded-full border border-white/20 bg-black/55 p-2 text-white shadow-lg transition hover:bg-black/75"
            aria-label="Close preview"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="border-b border-terra-moss/20 bg-terra-cream/90 p-4">
            <h3 className="truncate text-lg font-semibold text-terra-deep">
              {imageName}
            </h3>
            {isTiffPreview && tiffMeta ? (
              <div className="mt-3 space-y-3 rounded-xl border border-terra-moss/20 bg-white/80 p-3 text-xs text-terra-deep/85">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-terra-cream px-2 py-1">
                    {tiffMeta.width}x{tiffMeta.height}
                  </span>
                  <span className="rounded bg-terra-cream px-2 py-1">
                    Bandas: {tiffMeta.bandCount}
                  </span>
                  {tiffMeta.nodata !== null ? (
                    <span className="rounded bg-terra-cream px-2 py-1">NoData: {tiffMeta.nodata}</span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-medium">Modo</label>
                  <select
                    className="brand-input max-w-[170px] py-1.5 text-xs"
                    value={displayMode}
                    onChange={(e) => setDisplayMode(e.target.value as 'rgb' | 'single')}
                  >
                    {tiffMeta.bandCount >= 3 ? <option value="rgb">Composición RGB</option> : null}
                    <option value="single">Banda única</option>
                  </select>

                  <label className="text-xs font-medium">Stretch</label>
                  <select
                    className="brand-input max-w-[170px] py-1.5 text-xs"
                    value={stretchMode}
                    onChange={(e) => setStretchMode(e.target.value as 'minmax' | 'percentile')}
                  >
                    <option value="percentile">Percentiles</option>
                    <option value="minmax">Min-Max</option>
                  </select>
                </div>

                {stretchMode === 'percentile' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium">P%</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={percentileLow}
                      onChange={(e) => setPercentileLow(Number(e.target.value))}
                      className="brand-input w-20 py-1.5 text-xs"
                    />
                    <span className="text-xs">a</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={percentileHigh}
                      onChange={(e) => setPercentileHigh(Number(e.target.value))}
                      className="brand-input w-20 py-1.5 text-xs"
                    />
                  </div>
                ) : null}

                {displayMode === 'rgb' && tiffMeta.bandCount >= 3 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium">R</label>
                    <select
                      className="brand-input w-20 py-1.5 text-xs"
                      value={rgbBands.r}
                      onChange={(e) => setRgbBands((prev) => ({ ...prev, r: Number(e.target.value) }))}
                    >
                      {Array.from({ length: tiffMeta.bandCount }, (_, idx) => (
                        <option key={`r-${idx}`} value={idx}>
                          B{idx + 1}
                        </option>
                      ))}
                    </select>
                    <label className="text-xs font-medium">G</label>
                    <select
                      className="brand-input w-20 py-1.5 text-xs"
                      value={rgbBands.g}
                      onChange={(e) => setRgbBands((prev) => ({ ...prev, g: Number(e.target.value) }))}
                    >
                      {Array.from({ length: tiffMeta.bandCount }, (_, idx) => (
                        <option key={`g-${idx}`} value={idx}>
                          B{idx + 1}
                        </option>
                      ))}
                    </select>
                    <label className="text-xs font-medium">B</label>
                    <select
                      className="brand-input w-20 py-1.5 text-xs"
                      value={rgbBands.b}
                      onChange={(e) => setRgbBands((prev) => ({ ...prev, b: Number(e.target.value) }))}
                    >
                      {Array.from({ length: tiffMeta.bandCount }, (_, idx) => (
                        <option key={`b-${idx}`} value={idx}>
                          B{idx + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium">Banda</label>
                    <select
                      className="brand-input w-24 py-1.5 text-xs"
                      value={singleBand}
                      onChange={(e) => setSingleBand(Number(e.target.value))}
                    >
                      {Array.from({ length: tiffMeta.bandCount }, (_, idx) => (
                        <option key={`single-${idx}`} value={idx}>
                          B{idx + 1}
                        </option>
                      ))}
                    </select>
                    <label className="text-xs font-medium">Paleta</label>
                    <select
                      className="brand-input max-w-[170px] py-1.5 text-xs"
                      value={palette}
                      onChange={(e) =>
                        setPalette(
                          e.target.value as 'gray' | 'fire' | 'vegetation' | 'viridis' | 'firemask'
                        )
                      }
                    >
                      <option value="gray">Grises (natural)</option>
                      <option value="firemask">FireMask clases</option>
                      <option value="fire">Fuego</option>
                      <option value="vegetation">Vegetación</option>
                      <option value="viridis">Viridis</option>
                    </select>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-b border-terra-moss/15 bg-white/95 px-4 py-2">
            <div className="text-xs text-terra-deep/75">
              Zoom: {Math.round(zoom * 100)}%
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="brand-button-secondary px-3 py-1.5 text-xs"
                onClick={() => adjustZoom(1 / 1.25)}
              >
                -
              </button>
              <button
                type="button"
                className="brand-button-secondary px-3 py-1.5 text-xs"
                onClick={() => adjustZoom(1.25)}
              >
                +
              </button>
              <button
                type="button"
                className="brand-button-secondary px-3 py-1.5 text-xs"
                onClick={resetViewTransform}
              >
                Ajustar
              </button>
              <button
                type="button"
                className="brand-button-secondary px-3 py-1.5 text-xs"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                100%
              </button>
            </div>
          </div>

          <div
            ref={viewportRef}
            className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-terra-deep ${
              zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
            }`}
            onWheel={handleWheelZoom}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopPanning}
            onPointerLeave={stopPanning}
          >
            {loading ? (
              <div className="py-20">
                <svg
                  className="mx-auto h-12 w-12 animate-spin text-terra-sand"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="mt-4 text-white">Cargando imagen...</p>
              </div>
            ) : error ? (
              <div className="py-20 text-white">
                <p className="text-lg">{error}</p>
              </div>
            ) : imageUrl ? (
              <div
                className="select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 120ms ease-out',
                }}
              >
                {isTiffPreview ? (
                  <canvas
                    ref={canvasRef}
                    className="rounded bg-black"
                    aria-label={`Vista TIFF de ${imageName}`}
                  />
                ) : (
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt={imageName}
                    className="rounded object-contain"
                    draggable={false}
                    onLoad={fitToViewport}
                  />
                )}
              </div>
            ) : null}
            {rendering ? (
              <div className="absolute bottom-6 right-6 rounded-lg bg-black/65 px-3 py-1 text-xs text-white">
                Renderizando...
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}

