import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          ✦ CÂU CHUYỆN
        </p>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          <span className="text-gradient-gold">Về Emerald Vault</span>
        </h1>
      </div>

      <div className="prose prose-invert mx-auto max-w-3xl text-text-base">
        <p className="lead text-lg leading-relaxed text-text-muted">
          Emerald Vault ra đời từ tình yêu với những món đồ cổ mà thời gian đã lãng quên.
        </p>

        <div className="relative my-12 aspect-[16/9] overflow-hidden rounded-lg border border-gold/20">
          <Image
            src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&q=85"
            alt="Vintage jewelry workshop"
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
        </div>

        <h2 className="font-heading text-2xl text-gold">Khởi đầu từ Kyoto</h2>
        <p>
          Năm 1996, một cửa hàng nhỏ ở Kyoto mở ra với mong muốn tìm kiếm và bảo tồn những món trang sức
          cũ từ các tiệm kim hoàn truyền thống. Chủ tiệm — một nghệ nhân bạc — tin rằng mỗi món đồ đều
          mang trong mình một câu chuyện, một kỷ niệm, một thời đại.
        </p>

        <h2 className="font-heading text-2xl text-gold">Triết lý tuyển chọn</h2>
        <p>
          Chúng tôi không bán hàng loạt. Mỗi món đồ trong Emerald Vault đều được tuyển chọn thủ công bởi
          các chuyên gia có kinh nghiệm 30 năm trong nghề. Chúng tôi phân cấp theo Tier — từ SSS
          (mới nguyên seal, cực hiếm) đến S (trên 90%, phù hợp đeo hằng ngày).
        </p>

        <h2 className="font-heading text-2xl text-gold">Cam kết</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> 100% đã qua thẩm định chuyên gia</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Mỗi món là một bản duy nhất</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Đổi trả trong 7 ngày nếu không đúng mô tả</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Giao hàng cẩn thận, có bảo hiểm</li>
        </ul>
      </div>
    </div>
  );
}
