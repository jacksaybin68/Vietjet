import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import AirportPicker, { type Airport } from '@/app/trang-chu/components/AirportPicker';

const AIRPORTS: Airport[] = [
  { code: 'HAN', city: 'Hà Nội', airport: 'Nội Bài' },
  { code: 'SGN', city: 'Hồ Chí Minh', airport: 'Tân Sơn Nhất' },
  { code: 'PQC', city: 'Phú Quốc', airport: 'Phú Quốc' },
];

interface Geometry {
  innerHeight: number;
  /** Distance from the top of the window to the bottom of the field. */
  fieldBottom: number;
  /** Rendered height of the list, as a real browser would report it. */
  listHeight?: number;
}

/** The search row plus the count footer, as the panel measures it. */
const CHROME = 70;

/**
 * Open the list with the measurements the cap depends on stubbed. jsdom has no
 * layout, so `offsetHeight` and `getBoundingClientRect` read as 0 and the cap
 * would take its fallback every time — which means the branch that measures
 * the panel would never be exercised.
 *
 * The spies stay installed; `afterEach` in the suite clears them.
 */
function openList(geometry: Geometry) {
  setGeometry(geometry);
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
  return document.querySelector('[role="listbox"] ul') as HTMLUListElement;
}

function setGeometry({ innerHeight, fieldBottom, listHeight = 300 }: Geometry) {
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(innerHeight);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: fieldBottom,
  } as DOMRect);
  // The panel wraps the list, so it is taller by the search row and the count
  // footer. Everything else keeps the plain list height.
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.getAttribute('role') === 'listbox' ? listHeight + CHROME : listHeight;
  });
}

const capOf = (list: HTMLElement) => Number.parseFloat(list.style.maxHeight);

function setup(value = 'HAN') {
  const onChange = vi.fn();
  const { container } = render(
    <AirportPicker
      label="Điểm khởi hành"
      icon="takeoff"
      value={value}
      airports={AIRPORTS}
      onChange={onChange}
    />
  );
  return { onChange, container };
}

describe('AirportPicker', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the selected city and code', () => {
    setup('SGN');
    expect(screen.getByRole('button', { name: 'Điểm khởi hành' })).toHaveTextContent('Hồ Chí Minh');
    expect(screen.getByRole('button', { name: 'Điểm khởi hành' })).toHaveTextContent('SGN');
  });

  it('paints the list on the page surface, not the OS dropdown', () => {
    // A native <select> popup is drawn by the OS and ignores the stylesheet,
    // which is why the old dark-mode list could not be made white.
    const { container } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    const list = screen.getByRole('listbox', { name: 'Điểm khởi hành' });
    expect(list).toHaveClass('bg-white');
    expect(container.querySelector('select')).toBeNull();
  });

  it('lists every airport with its name', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('Nội Bài')).toBeInTheDocument();
  });

  it('filters by city, code and airport name', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    const search = screen.getByRole('textbox', { name: 'Tìm điểm khởi hành' });

    fireEvent.change(search, { target: { value: 'phu' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);

    // Matching the IATA code works too, and it is not case sensitive.
    fireEvent.change(search, { target: { value: 'sgn' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);

    fireEvent.change(search, { target: { value: 'tan son' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('tells the customer how many airports there are, and how many matched', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    expect(screen.getByText('3 sân bay')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm điểm khởi hành' }), {
      target: { value: 'quoc' },
    });
    // "sân bay" is dropped while filtering — the count sits next to the search
    // box that produced it, so the unit is already understood.
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('keeps the list inside the viewport instead of running off the bottom', () => {
    // The list is capped to the room below the field, because no constant
    // works: the hero's own height steps at several breakpoints, so the space
    // under the form measured 334px on a 1201x768 screen and 434px on a
    // 375x667 one. A cap loose enough for the small screen pushed the panel
    // off-screen on the short one, and a tight one clipped airports the
    // customer could not scroll to.
    const list = openList({ innerHeight: 600, fieldBottom: 420 });
    // 600 - 420 - 70 (search row + count footer) - 16 (bottom gap) = 94,
    // raised to the 96px floor so at least one airport is reachable.
    expect(capOf(list)).toBe(96);
  });

  it('takes the search row and count footer height from the panel, not a constant', () => {
    // The chrome was a literal 70px, which was only correct while the search
    // row and the footer were both fixed-height. A footer that wrapped to two
    // lines grew the panel by 16px and the cap ignored it, pushing the last
    // airports below the fold. Measuring the panel removes the coupling.
    const list = openList({ innerHeight: 1000, fieldBottom: 300, listHeight: 200 });
    // 1000 - 300 - 70 - 16 = 614, above the 448 cap.
    expect(capOf(list)).toBe(448);

    // Same window, but the panel now carries 40px more chrome.
    setGeometry({ innerHeight: 1000, fieldBottom: 300, listHeight: 200 });
    act(() => {
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
        this: HTMLElement
      ) {
        return this.getAttribute('role') === 'listbox' ? 240 : 200;
      });
      window.dispatchEvent(new Event('resize'));
    });
    // 1000 - 300 - 110 - 16 = 574, still above the cap.
    expect(capOf(list)).toBe(448);

    // Only when the extra chrome pushes the budget under the cap does it show.
    setGeometry({ innerHeight: 700, fieldBottom: 300, listHeight: 200 });
    act(() => {
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
        this: HTMLElement
      ) {
        return this.getAttribute('role') === 'listbox' ? 240 : 200;
      });
      window.dispatchEvent(new Event('resize'));
    });
    // The panel measures 240 and the list 200, so the chrome is 40 — the
    // difference, not the 70px constant. 700 - 300 - 40 - 16 = 344.
    expect(capOf(list)).toBe(344);
  });

  it('lets a tall screen use the full list height', () => {
    const list = openList({ innerHeight: 1200, fieldBottom: 300 });
    expect(capOf(list)).toBe(448);
  });

  it('re-measures the cap when the window is resized', () => {
    // A 300px-tall window on a 1200px screen leaves room for the full 448px
    // list; shrink the window to 400px and the same field now has to give up
    // height, or the panel would hang off the bottom of the screen.
    const list = openList({ innerHeight: 1200, fieldBottom: 300 });
    expect(capOf(list)).toBe(448);

    setGeometry({ innerHeight: 400, fieldBottom: 300 });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(capOf(list)).toBe(96);
  });

  it('reports when nothing matches', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm điểm khởi hành' }), {
      target: { value: 'zzzz' },
    });
    expect(screen.getByText('Không tìm thấy sân bay')).toBeInTheDocument();
  });

  it('selects an airport and closes', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    fireEvent.click(screen.getByRole('option', { name: /Phú Quốc/ }));
    expect(onChange).toHaveBeenCalledWith('PQC');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks the current selection for screen readers', () => {
    setup('PQC');
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    expect(screen.getByRole('option', { name: /Phú Quốc/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('option', { name: /Hà Nội/ })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('closes on Escape and resets the search', () => {
    setup();
    const trigger = screen.getByRole('button', { name: 'Điểm khởi hành' });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm điểm khởi hành' }), {
      target: { value: 'phu' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('drops its own border in the flush variant so the group box stays single', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AirportPicker
        label="Điểm đến"
        icon="land"
        value="SGN"
        airports={AIRPORTS}
        onChange={onChange}
        variant="flush"
        className="sm:col-span-2"
      />
    );
    const label = container.querySelector('label')!;
    expect(label.className).not.toContain('rounded');
    expect(label.className).not.toContain('border-[#e4e4e4]');
    expect(container.firstElementChild).toHaveClass('sm:col-span-2');
  });
});
