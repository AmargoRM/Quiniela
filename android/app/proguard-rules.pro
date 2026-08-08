# Reglas por defecto. La app no ofusca (isMinifyEnabled=false), pero se dejan
# reglas seguras por si se activa R8 en el futuro.
-keepattributes *Annotation*
-keep class app.toctoc.timbre.** { *; }
