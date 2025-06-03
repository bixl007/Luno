import { About } from "./About";
import { Feats } from "./Feats";
import { Main } from "./Main";
import { Nav } from "./Nav";
import { TracingBeam } from "../../components/ui/tracing-beam";
import { Parall } from "./Parall";

export function Landing() {
  return (
    
    <div className="w-full sm:w-11/12 md:w-10/12 lg:w-9/12 mx-auto px-3 my-3 sm:px-0 lg:my-6">
      <Nav />
      <Main />
      <TracingBeam>
      <Parall />
        <Feats />
        <About />
      </TracingBeam>
    </div>
  );
}
