import { createContext } from "react";

import type { CarouselContextProps } from "./carrusel-types";

export const CarouselContext = createContext<CarouselContextProps | null>(null);
