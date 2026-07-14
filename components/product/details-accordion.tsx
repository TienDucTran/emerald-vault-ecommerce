'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface DetailsAccordionProps {
  product: Product;
}

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

const SHIPPING_CONTENT = (
  <div className="space-y-3 text-sm leading-relaxed text-text-muted">
    <p>
      <span className="font-semibold text-text-base">Vận chuyển nội địa:</span>{' '}
      Miễn phí trên toàn quốc. Giao hỏa tốc trong 2–4 giờ tại TP. HCM và Hà Nội.
    </p>
    <p>
      <span className="font-semibold text-text-base">Vận chuyển quốc tế:</span>{' '}
      DHL Express — 3–5 ngày làm việc. Phí ship tính theo khu vực, báo giá trước khi thanh toán.
    </p>
    <p>
      <span className="font-semibold text-text-base">Đổi trả:</span> 7 ngày kể từ
      ngày nhận hàng. Sản phẩm phải còn nguyên tag, hộp và giấy kiểm định.
    </p>
  </div>
);

const CARE_CONTENT = (
  <div className="space-y-3 text-sm leading-relaxed text-text-muted">
    <p>
      <span className="font-semibold text-text-base">Bảo quản:</span> Để trong
      hộp có lớp lót nhung, tránh va đập và hóa chất (nước hoa, xà phòng, clorine).
    </p>
    <p>
      <span className="font-semibold text-text-base">Vệ sinh:</span> Lau nhẹ bằng
      vải microfiber ẩm. Không dùng máy siêu âm cho đá quý tự nhiên.
    </p>
    <p>
      <span className="font-semibold text-text-base">Bảo hành:</span> Bảo hành
      làm sáng và xi mạ trọn đời. Kiểm định lại GIA miễn phí sau 2 năm.
    </p>
  </div>
);

export function DetailsAccordion({ product }: DetailsAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const items: AccordionItem[] = [
    {
      title: 'THÔNG SỐ KỸ THUẬT',
      content: product.specs && product.specs.length > 0 ? (
        <div className="divide-y divide-gold/10">
          {product.specs.map((spec, i) => (
            <div key={i} className="flex justify-between gap-8 py-3 text-sm">
              <span className="shrink-0 text-text-muted">{spec.label}</span>
              <span className="text-right font-medium text-text-base">
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">Chưa có thông số kỹ thuật.</p>
      ),
    },
    {
      title: 'VẬN CHUYỂN & ĐỔI TRẢ',
      content: SHIPPING_CONTENT,
    },
    {
      title: 'HƯỚNG DẪN BẢO QUẢN',
      content: CARE_CONTENT,
    },
  ];

  return (
    <section className="mx-auto max-w-3xl pt-12">
      <div className="flex flex-col gap-4">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="border-b border-gold/20 bg-surface-emerald/30"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between px-6 py-6 text-left transition-colors hover:text-gold"
              >
                <span className="font-heading text-xl tracking-wide text-text-base">
                  {item.title}
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-gold transition-transform duration-300',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
              <div
                className={cn(
                  'grid transition-all duration-300',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-6">{item.content}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}