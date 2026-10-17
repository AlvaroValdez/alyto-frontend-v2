package com.avfinance.alyto;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * Fija el zoom de texto del WebView al 100%.
     *
     * Por defecto, el WebView de Android aplica la escala de fuente del SISTEMA.
     * Un usuario con "Tamaño de fuente: Grande" ve todo el texto a 1,3x o 1,5x
     * mientras los anchos en píxeles y el viewport NO cambian, así que las filas
     * que a tamaño normal van justas se desbordan. A eso se suma el "Zoom de
     * pantalla" de Samsung, muy habitual en la serie A, que estrecha el ancho CSS
     * efectivo de 360 a unos 320 píxeles.
     *
     * Esa combinación explica el "en algunos celulares se veía mal en algunas
     * secciones": fallaba justo en los equipos con la fuente ampliada, y solo en
     * las pantallas con filas al límite.
     *
     * ⚠️ Contrapartida de accesibilidad: esto ignora la preferencia de tamaño de
     * letra del usuario. Es un compromiso consciente mientras el diseño no esté
     * probado a escalas mayores. Lo correcto a futuro es quitar esta línea y
     * arreglar los desbordamientos uno a uno, no dejarla para siempre.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setTextZoom(100);
        }
    }
}
