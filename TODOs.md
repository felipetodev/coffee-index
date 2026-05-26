# TODOs

Ahora mismo todos los archivos y cafeterias son estaticas. El contenido vive en el mismo archivo y eso es poco flexible y escalable.

Quiero poder tener una sección de "Añade tu local" parecido a lo que "Conviértete en anfitrión" de Airbnb.

En esa sección, el usuario podría rellenar un formulario con los datos de su local, como por ejemplo:
- Nombre del local
- Comuna
- Dirección o Direcciones
- Descripción
- Horarios
- Imagenes
- Contacto
- Social networks
- Features (Wifi, enchufes, etc)
- Tags (co-working, terraza, etc)

Una vez el usuario rellene el formulario, se le enviará un email de confirmación y se le notificará que su local ha sido añadido a la plataforma.

Además, me gustaría tener una sección de "Admin" donde pueda ver todos los locales añadidos por los usuarios, aprobarlos o rechazarlos, y editarlos si es necesario.

Cada local, debe ser un "workspace" con su propia página, donde puedan modificar o actualizar su información, horarios, fotos, etc. También podrían tener una sección de "Eventos" donde puedan publicar eventos relacionados con su local, como por ejemplo "Shows Stand Up", "Concierto en vivo", etc.

En cada worskapce, debe haber un usuario 'admin' que pueda gestionar el local, y que además se puedan invitar usuarios 'colaboradores' que puedan ayudar a gestionar el local, pero no tengan acceso a todas las funcionalidades del admin, como eliminar el local o aprobar eventos.

Con esto, ya podriamos comenzar a popular la plataforma con locales y eventos, y ofrecer una experiencia más personalizada a los usuarios.

De momento deberiamos crear cada workspace que tenemos hardcodeado en lib/cafes.ts para cada local.

Tambien el usuario 'Admin' (de toda la plataforma) debe ser capaz de poder validar y transferir el workspace a los datos reales de una cafeteria una vez el local ellos se contacten con nosotros y nos den la información real de su local. De esta forma, el local pasará de ser un workspace de prueba a ser un workspace real con toda la información actualizada.

Cada workspace que se haya transferido correctamente a un usuario real que sea dueño o admin valido de la cafeteria, debe ser marcado como "verified" o "validated" para que los usuarios puedan confiar en la información que se muestra en la plataforma. Y añadir un verificado/badge al lado del nombre del local para que los usuarios puedan identificar fácilmente los locales verificados.

TODO para más adelante: añadir registro de usuarios para que puedan dejar reviews y valoraciones de los locales, y para que los dueños de los locales puedan gestionar su información y eventos.
