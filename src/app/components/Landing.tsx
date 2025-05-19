import { About } from "./About";
import { Feats } from "./Feats";
import { Main } from "./Main";
import { Navbar } from "./Navbar";

export function Landing() {
  return (
    <div className="w-full sm:w-11/12 md:w-10/12 lg:w-9/12 mx-auto px-3 my-3 sm:px-0 lg:my-6">
      <Navbar />
      <Main />
      <Feats />
      <About />
    </div>
  );
}
