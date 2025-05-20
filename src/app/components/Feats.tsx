export function Feats() {
  return (
    <section id="features" className=" text-white py-4 px-6 font-sans">
      <div className="max-w-5xl mx-auto">
        <h2
          className="
            text-6xl lg:text-7xl font-light mb-8
            bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800
            bg-clip-text text-transparent
          "
        >
          Core Features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {[
            {
              title: "Human-First",
              desc: "Every reply is crafted to feel genuinely conversational—no robotic jargon.",
            },
            {
              title: "Adaptive Learning",
              desc: "Luno evolves with you—learning context, tone, and preferences over time.",
            },
            {
              title: "Privacy-First",
              desc: "All data in transit between client and server is protected by HTTPS/TLS, so your messages can't be intercepted in transit.",
            },
            {
              title: "Mood-Adaptive",
              desc: "Luno senses your tone and tailors replies to match your current communication style.",
            },
            {
              title: "Human-Friendly",
              desc: "Designed for natural conversation that feels like chatting with a helpful friend.",
            },
            {
              title: "Smart-Response",
              desc: "Intelligent replies that understand context and provide relevant information.",
            },
          ].map(({ title, desc }) => (
            <div
              key={title}
              className="p-6 bg-white/5 rounded-2xl border border-white/10"
            >
              <h3 className="text-2xl font-light mb-2">{title}</h3>
              <p className="text-base font-light text-gray-300 leading-snug">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
