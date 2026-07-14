import { ShieldCheck, Clock, Truck, Lock } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Chính hãng 100%',
    desc: 'Giám định chuyên nghiệp',
  },
  {
    icon: Clock,
    title: 'Giữ hàng 10 phút',
    desc: 'Độc quyền cho quý khách',
  },
  {
    icon: Truck,
    title: 'Freeship > 2tr',
    desc: 'Vận chuyển bảo mật cao',
  },
  {
    icon: Lock,
    title: 'Thanh toán bảo mật',
    desc: 'Mã hóa đa tầng chuẩn quốc tế',
  },
];

export function TrustStrip() {
  return (
    <section className="hidden md:block border-y border-gold/10 bg-surface-emerald py-12">
      <div className="container mx-auto px-8">
        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex w-full max-w-[250px] flex-col items-center gap-4 text-center md:w-auto"
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