'use client';

import { useEffect, useRef } from 'react';
import grapesjs, { type Component, type Editor } from 'grapesjs';
import {
  HOMEPAGE_SECTION_CATALOG,
  type PageLayout,
  type SectionStyle,
} from '../types';

interface VisualEditorCanvasProps {
  layout: PageLayout;
  selectedId: string | null;
  onSelect: (sectionId: string | null) => void;
  onReorder: (orderedIds: string[]) => void;
  onStyleChange: (sectionId: string, style: SectionStyle) => void;
}

/**
 * Canvas kéo-thả của GrapesJS.
 *
 * GrapesJS ở đây đóng vai trò **trình bày** bố cục, không phải trình sinh
 * HTML: mỗi section của trang chủ là một component GrapesJS, và những gì
 * người vận hành làm trên canvas (kéo-thả đổi thứ tự, chỉnh padding / màu
 * nền / max-width) được chuyển thành thay đổi trên `PageLayout`.
 *
 * Nếu để GrapesJS sinh HTML rồi lưu xuống DB, trang chủ sẽ mất toàn bộ hành
 * vi React (khung đặt vé, carousel) và các phép đo đối chiếu với
 * vietjetair.com. Vì vậy canvas chỉ giữ *ý định* bố cục.
 */

/** Thuộc tính đặc biệt lưu id section lên component GrapesJS. */
const SECTION_ID_ATTR = 'data-vjs-section';

/** Class mà GrapesJS dùng cho phần tử đang được chọn. */
const SELECTED_CLASS = 'vjs-section--selected';

export default function VisualEditorCanvas({
  layout,
  selectedId,
  onSelect,
  onReorder,
  onStyleChange,
}: VisualEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  // Callback refs: giữ cho GrapesJS luôn gọi phiên bản mới nhất mà không
  // phải re-init editor mỗi khi parent render lại.
  const handlersRef = useRef({ onSelect, onReorder, onStyleChange });
  handlersRef.current = { onSelect, onReorder, onStyleChange };

  // Khởi tạo editor một lần.
  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      // Canvas hiển thị trực tiếp, không cần iframe: các section chỉ là khung
      // placeholder nên không có vấn đề nguồn gốc, và không iframe thì việc
      // kéo-thả mượt hơn nhiều.
      height: '100%',
      width: 'auto',
      storageManager: false,
      autoCss: false,
      canvas: {
        autoplay: false,
      },
      styleManager: {
        appendTo: containerRef.current.parentElement ?? undefined,
        sectors: [
          {
            id: 'layout',
            name: 'Bố cục',
            properties: [
              {
                id: 'padding-top',
                label: 'Padding trên',
                property: 'padding-top',
                type: 'integer',
                min: 0,
                max: 400,
                step: 4,
                default: '',
              },
              {
                id: 'padding-bottom',
                label: 'Padding dưới',
                property: 'padding-bottom',
                type: 'integer',
                min: 0,
                max: 400,
                step: 4,
                default: '',
              },
              {
                id: 'max-width',
                label: 'Chiều rộng tối đa',
                property: 'max-width',
                type: 'integer',
                min: 0,
                max: 2400,
                step: 20,
                default: '',
              },
            ],
          },
          {
            id: 'colors',
            name: 'Màu nền',
            properties: [
              {
                id: 'background-color',
                label: 'Màu nền',
                property: 'background-color',
                type: 'color',
              },
            ],
          },
        ],
      },
      blockManager: {
        appendTo: containerRef.current.parentElement ?? undefined,
        blocks: [],
      },
    });

    editorRef.current = editor;

    // Khi người vận hành bấm vào một section trên canvas.
    editor.on('component:selected', (component: Component) => {
      const id = readSectionId(component);
      handlersRef.current.onSelect(id);
    });

    editor.on('component:deselected', () => {
      handlersRef.current.onSelect(null);
    });

    // Style Manager đổi style → đồng bộ ngược về layout.
    editor.on('component:styleUpdate', (component: Component) => {
      const id = readSectionId(component);
      if (!id) return;
      handlersRef.current.onStyleChange(id, readStyle(component));
    });

    // Kéo-thả đổi thứ tự. GrapesJS không có event "move" riêng, nên ta dùng
    // `component:drag:end` (sau khi thả) và đọc lại thứ tự component trong
    // wrapper. Đọc trong `setTimeout(0)` để chắc chắn collection đã cập
    // nhật xong trước khi ta đọc.
    editor.on('component:drag:end', () => {
      setTimeout(() => {
        handlersRef.current.onReorder(readOrder(editor));
      }, 0);
    });

    return () => {
      editorRef.current = null;
      editor.destroy();
    };
  }, []);

  // Đồng bộ layout từ parent (khi panel bên phải đổi thứ tự / bật-tắt / style).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentOrder = readOrder(editor);
    const nextOrder = layout.sections.map((section) => section.id);

    const sameOrder =
      currentOrder.length === nextOrder.length &&
      currentOrder.every((id, index) => id === nextOrder[index]);

    if (!sameOrder) {
      // Sắp xếp lại bằng cách dựng lại danh sách component theo thứ tự mới.
      // GrapesJS không có API "sort", nên ta dựng lại wrapper.
      editor.setComponents(nextOrder.map((id) => buildSectionComponent(id, layout)));
    } else {
      // Thứ tự đã khớp — chỉ cập nhật style/visibility từng section.
      for (const section of layout.sections) {
        const component = findComponent(editor, section.id);
        if (!component) continue;
        applyStyle(component, section.style);
      }
    }
  }, [layout]);

  // Highlight section đang được chọn.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    for (const section of layout.sections) {
      const component = findComponent(editor, section.id);
      if (!component) continue;
      component.removeClass(SELECTED_CLASS);
      if (section.id === selectedId) component.addClass(SELECTED_CLASS);
    }
  }, [selectedId, layout]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f4f5f7]">
      {/* CSS của canvas nạp riêng, không đụng tới global CSS của app. */}
      <link rel="stylesheet" href="/editor/canvas.css" />
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/** Đọc id section từ component GrapesJS. */
function readSectionId(component: Component | undefined): string | null {
  if (!component) return null;
  const attrs = component.getAttributes?.() ?? {};
  const id = attrs[SECTION_ID_ATTR];
  return typeof id === 'string' && id ? id : null;
}

/** Đọc style đã allow-list từ component GrapesJS. */
function readStyle(component: Component): SectionStyle {
  const style = component.getStyle?.() ?? {};

  const readNumber = (key: string): number | undefined => {
    const raw = style[key];
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const parsed = Number.parseInt(raw.replace(/px$/i, ''), 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const result: SectionStyle = {};

  const paddingTop = readNumber('padding-top');
  if (typeof paddingTop === 'number') result.paddingTop = paddingTop;

  const paddingBottom = readNumber('padding-bottom');
  if (typeof paddingBottom === 'number') result.paddingBottom = paddingBottom;

  const maxWidth = readNumber('max-width');
  if (typeof maxWidth === 'number') result.maxWidth = maxWidth;

  const backgroundColor = style['background-color'];
  if (typeof backgroundColor === 'string' && backgroundColor.trim()) {
    result.backgroundColor = backgroundColor.trim();
  }

  return result;
}

/** Áp style đã lưu lên component GrapesJS. */
function applyStyle(component: Component, sectionStyle: SectionStyle): void {
  const next: Record<string, string> = {};

  if (typeof sectionStyle.paddingTop === 'number') {
    next['padding-top'] = `${sectionStyle.paddingTop}px`;
  }
  if (typeof sectionStyle.paddingBottom === 'number') {
    next['padding-bottom'] = `${sectionStyle.paddingBottom}px`;
  }
  if (typeof sectionStyle.maxWidth === 'number') {
    next['max-width'] = `${sectionStyle.maxWidth}px`;
  }
  if (sectionStyle.backgroundColor) {
    next['background-color'] = sectionStyle.backgroundColor;
  }

  // `setStyle` với object đầy đủ thay thế style hiện có; các thuộc tính
  // không được set sẽ bị xoá — đúng thứ ta muốn khi người vận hành xoá
  // một giá trị trong Style Manager.
  component.setStyle?.(next);
}

/** Thứ tự các section đang có trong canvas. */
function readOrder(editor: Editor): string[] {
  const wrapper = editor.getWrapper();
  if (!wrapper) return [];

  return wrapper
    .getComponents()
    .map((component) => readSectionId(component))
    .filter((id): id is string => Boolean(id));
}

/** Tìm component theo id section. */
function findComponent(editor: Editor, sectionId: string): Component | undefined {
  const wrapper = editor.getWrapper();
  if (!wrapper) return undefined;

  return wrapper
    .getComponents()
    .find((component) => readSectionId(component) === sectionId);
}

/**
 * Dựng component GrapesJS cho một section.
 *
 * Nội dung bên trong chỉ là khung placeholder có nhãn — phần nội dung thật
 * của trang chủ vẫn được render bởi React ở `/trang-chu`. Mục tiêu của
 * canvas là để người vận hành thấy và sắp xếp *cấu trúc* trang.
 */
function buildSectionComponent(sectionId: string, layout: PageLayout) {
  const entry = HOMEPAGE_SECTION_CATALOG.find((item) => item.id === sectionId);
  const section = layout.sections.find((item) => item.id === sectionId);
  const isHidden = section ? section.visible === false : false;

  return {
    tagName: 'div',
    attributes: {
      [SECTION_ID_ATTR]: sectionId,
      class: `vjs-section${isHidden ? ' vjs-section--hidden' : ''}`,
    },
    components: [
      {
        tagName: 'div',
        attributes: { class: 'vjs-section__label' },
        components: [
          {
            tagName: 'span',
            components: entry?.label ?? sectionId,
          },
          {
            tagName: 'span',
            attributes: { class: 'vjs-section__id' },
            components: sectionId,
          },
          ...(isHidden
            ? [
                {
                  tagName: 'span',
                  attributes: { class: 'vjs-section__badge' },
                  components: 'Đang ẩn',
                },
              ]
            : []),
        ],
      },
      {
        tagName: 'div',
        attributes: { class: 'vjs-section__desc' },
        components: entry?.description ?? '',
      },
      {
        tagName: 'span',
        attributes: { class: 'vjs-section__handle' },
        components: '⠿',
      },
    ],
  };
}
