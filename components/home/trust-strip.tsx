import { ShieldCheck, Clock, Truck, Lock } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Đã qua thẩm định',
    desc: 'Kiểm định chất lượng từng món',
  },
  {
    icon: Clock,
    title: 'Giữ hàng 10 phút',
    desc: 'Độc quyền cho quý khách',
  },
  {
    icon: Truck,
    title: 'Freeship > 500k',
    desc: 'Cho đơn hàng từ ₫500,000',
  },
  {
    icon: Lock,
    title: 'Thanh toán bảo mật',
    desc: 'Mã hóa đa tầng chuẩn quốc tế',
  },
];

export function TrustStrip() {
  return (
    <section className="border-y border-gold/10 bg-surface-emerald py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-store px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6 lg:gap-12">
          {TRUST_ITEMS.map((item, i) => (
            <div
              key={item.title}
              className="flex flex-col items-center gap-4 text-center motion-safe:animate-slideInLeft"
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
            >
              {/* Icon */}
              <div className="grid h-12 w-12 place-items-center text-gold">
                <item.icon className="h-7 w-7" />
              </div>
              {/* Title */}
              <h3 className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-gold">
                {item.title}
              </h3>
              {/* Description */}
              <p className="text-sm text-text-muted opacity-70">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
