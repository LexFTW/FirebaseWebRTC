# Firebase + WebRTC
## How works the application

En este ejemplo, el usuario que accede dispone de 3 opciones. La primera y que es obligatoria para proceder a las otras dos es la de autorizar el uso de sus dispositivos (camara y audio).

Una vez el usuario autoriza el uso, se genera una interface MediaStream que guarda la información de los dispositivos y otra que será para la información remota. Despues ambas interface se añaden a sus respectivas etiquetas video para que muestren el stream.

Dicho esto, el usuario ahora dispone de las otras 2 opciones, *Crear sala* y
*Unirse a una sala*.

En la opción de crear sala, se genera una instancia de RTCPeerConnection para empezar a establecer la conexión entre máquinas. Después se añaden los listeners de estado para esta instancia y se añaden las pistas que usa el usuario a la conexión.

A continuación, se añaden todos los ICE Candidate a la conexión, todos los candidatos que se añaden no dejan de ser la misma información, pero pasando diferentes protocolos (UDP / TCP) y las direcciones IP que tiene el usuario (públicas, privadas, IPv4, IPv6...). Cuando se añaden los candidatos, estas las guardo en una colección de Firestore para más adelante poder acceder a esa información desde la conexión remota.

Para acabar, genero la oferta que esta contiene la información sobre la conexión y la establezco en la misma para indicar que esa oferta forma parte de la conexión local y la añado también en la colección. Cuando se establece la descripción local, se activa el listener de 'icegatheringstatechange' para que la conexión llame al método que le dará la información de todos los candidatos.