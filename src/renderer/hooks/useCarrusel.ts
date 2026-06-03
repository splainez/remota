import { CarouselContext } from "@renderer/components/ui/carrusel-context";
import { useContext } from "react";

export function useCarousel() {
	const context = useContext(CarouselContext);

	if (!context) {
		throw new Error("useCarousel must be used within a <Carousel />");
	}

	return context;
}
