export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl mx-auto py-12 prose">
      <h1>Kebijakan Privasi</h1>
      <p>
        Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data
        pribadi Anda saat menggunakan layanan MyToko. Dengan menggunakan situs ini, Anda menyetujui praktik yang
        dijelaskan dalam kebijakan ini.
      </p>

      <h2>Informasi yang Kami Kumpulkan</h2>
      <ul>
        <li>Data akun: alamat email dan nama (jika diisi).</li>
        <li>Data pesanan: produk yang dibeli, jumlah, harga, total dan riwayat transaksi.</li>
        <li>Data perangkat dan penggunaan: alamat IP, jenis perangkat, dan analitik penggunaan untuk meningkatkan layanan.</li>
      </ul>

      <h2>Bagaimana Kami Menggunakan Data</h2>
      <ul>
        <li>Memproses pesanan dan menyediakan layanan yang Anda minta.</li>
        <li>Autentikasi dan keamanan akun (melalui Supabase Auth).</li>
        <li>Meningkatkan performa aplikasi dan pengalaman pengguna.</li>
        <li>Komunikasi terkait layanan, seperti konfirmasi pesanan dan dukungan.</li>
      </ul>

      <h2>Penyimpanan dan Keamanan</h2>
      <p>
        Data disimpan di infrastruktur Supabase dan/atau penyedia hosting kami (Vercel). Kami menerapkan praktik
        keamanan standar industri, termasuk kontrol akses dan enkripsi saat transit. Namun, tidak ada metode transmisi
        data melalui internet yang sepenuhnya aman; gunakan layanan ini dengan pertimbangan Anda.
      </p>

      <h2>Berbagi Data dengan Pihak Ketiga</h2>
      <p>
        Kami tidak menjual data pribadi Anda. Data dapat dibagikan kepada penyedia layanan yang membantu operasional
        aplikasi (mis. Supabase, Vercel) sesuai kebutuhan dan tunduk pada perjanjian pemrosesan data mereka.
      </p>

      <h2>Hak Anda</h2>
      <ul>
        <li>Mengakses, memperbarui, atau menghapus data akun Anda.</li>
        <li>Meminta informasi tentang bagaimana data Anda diproses.</li>
        <li>Mencabut persetujuan tertentu, sejauh diizinkan oleh hukum yang berlaku.</li>
      </ul>

      <h2>Kontak</h2>
      <p>
        Pertanyaan terkait privasi: +6287787128257 atau <a href="mailto:faiznaufal2015@gmail.com">faiznaufal2015@gmail.com</a>
      </p>

      <h2>Pembaruan Kebijakan</h2>
      <p>
        Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan signifikan akan diberitahukan melalui situs.
      </p>
    </div>
  )
}
