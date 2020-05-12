## II.11 Semantics of classes

Classes, as specified in [Partition I](#todo-missing-hyperlink), define types in an inheritance hierarchy. A class (except for the built-in class `System.Object` and the special class `<Module>`) shall declare exactly one base class. A class shall declare zero or more interfaces that it implements (§[II.12](ii.12-semantics-of-interfaces.md)). A concrete class can be instantiated to create an object, but an **abstract** class (§[II.10.1.4](#todo-missing-hyperlink)) shall not be instantiated. A class can define fields (static or instance), methods (static, instance, or virtual), events, properties, and nested types (classes, value types, or interfaces).

Instances of a class (i.e., objects) are created only by explicitly using the `newobj` instruction (see [Partition III](#todo-missing-hyperlink)). When a variable or field that has a class as its type is created (for example, by calling a method that has a local variable of a class type), the value shall initially be null, a special value that := with all class types even though it is not an instance of any particular class.