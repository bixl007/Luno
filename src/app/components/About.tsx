export function About() {
  return (
    <section className=" text-white py-2 px-4 font-sans">
      <div className="max-w-5xl mx-auto">
        <h2
          className="
        text-6xl lg:text-7xl font-light
        bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800
        bg-clip-text text-transparent mb-6"
        >
          About Luno
        </h2>

        <p className="text-xl lg:text-2xl font-light text-gray-300 leading-snug mb-12">
          Luno is your next‑gen AI companion—conversations that feel human,
          insights that hit instantly, and an experience that’s always on point.
        </p>

        <div className="border-t border-gray-700 mb-12"></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-1 space-y-8">
            <h3 className="text-3xl font-light text-purple-300">
              Core Principles
            </h3>
            <div className="space-y-6">
              <div className="flex items-start">
                <div>
                  <h4 className="text-2xl font-light">Human‑First</h4>
                  <p className="text-gray-400 font-light leading-snug">
                    Every reply is crafted to feel genuinely conversational—no
                    robotic jargon.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div>
                  <h4 className="text-2xl font-light">Adaptive Learning</h4>
                  <p className="text-gray-400 font-light leading-snug">
                    Luno evolves with you—learning context, tone, and
                    preferences over time.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div>
                  <h4 className="text-2xl font-light">Privacy‑First</h4>
                  <p className="text-gray-400 font-light leading-snug">
                    All data in transit between client and server is protected
                    by HTTPS/TLS, so your messages can’t be intercepted in
                    transit.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="flex flex-wrap gap-3">
              {[
                "Mood‑Adaptive",
                "Human-Friendly",
                "Smart-Response",
                "Digital-Companion",
              ].map((pill) => (
                <span
                  key={pill}
                  className="bg-purple-800 bg-opacity-30 text-purple-300 px-4 py-1 rounded-full text-sm font-light"
                >
                  {pill}
                </span>
              ))}
            </div>

            <p className="text-base lg:text-lg font-light text-gray-300 leading-relaxed">
              Meet Luno, the minimalist chatbot built to simplify your digital
              life. Whether you're looking for quick answers, real-time support,
              or just a chill conversation, Luno is always on, always sharp.
              With a clean interface and smart responses, it's like having the
              moonlight version of AI in your pocket—calm, smart, and just a
              little bit cosmic.
            </p>
            <p className="text-base lg:text-lg font-light text-gray-300 leading-relaxed">
              Luno strips away the noise, focusing only on what matters to you.
              No flashy features or complicated settings—just clear, helpful
              communication when you need it. Our intuitive design means you
              spend less time figuring things out and more time getting things
              done, making digital interactions feel natural and effortless.
            </p>
            <p className="text-base lg:text-lg font-light text-gray-300 leading-relaxed">
              Available day or night, Luno illuminates your digital journey with
              just the right amount of brightness. We believe technology should
              adapt to your life, not the other way around. That's why Luno is
              designed to be there exactly when you need it, providing clarity
              without overwhelming you. Keep it simple. Keep it Luno.
            </p>
          </div>
        </div>

        <div className="text-center">
          <button className="px-10 py-4 text-2xl font-light bg-gradient-to-r from-purple-500 to-purple-700 rounded-full text-white shadow-lg hover:scale-105 transition-transform">
            Try Luno Today
          </button>
        </div>
      </div>
    </section>
  );
}
