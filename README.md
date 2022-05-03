### Autonomous Software Agents - Project

University of Trento - Trento, 2022

Davide Lusuardi - davide.lusuardi@studenti.unitn.it

# Description
Implementation of the smart house.<br>
The [scenario](src/myhouse/scenario.js) proposed implements a smart 
house composed of two floors, the garage and the garden.
The lights are present in each room and for each window there is an electric shutter.
A television is present in the living room with some lights dedicated and 
the garage door is electric.
A solar panel installation of 5 kW is present on the roof.

# Classes
## Devices and People
### class [`Person`](src/myhouse/Person.js)
Representation of a person.<br>
Methods: `moveTo()` another room.

### class [`LightDevice`](src/myhouse/Light.js)
Representation of a light.<br>
Methods: `turnOn()` and `turnOff()`.

### class [`ShutterDevice`](src/myhouse/Shutter.js)
Representation of a shutter.<br>
Methods: `goUp()` and `goDown()`.

### class [`GarageDoorDevice`](src/myhouse/GarageDoor.js)
Representation of the electric garage door.<br>
Methods: `open()` and `close()`.

### class [`TelevisionDevice`](src/myhouse/Television.js)
Representation of the television.<br>
Methods: `turnOn()` and `turnOff()`.

### class [`SolarPanelDevice`](src/myhouse/SolarPanel.js)
Representation of the solar panels.<br>
Methods: `activate()` and `deactivate()`.


## Goals and Intentions
### class [`PersonDetectionGoal`](src/myhouse/Person.js)
Goal: keep detecting people in the rooms.
### class [`PersonDetectionIntention`](src/myhouse/Person.js)
Implementation of the goal `PersonDetectionGoal`.

### class [`BrightnessSensingGoal`](src/myhouse/BrightnessSensing.js)
Goal: keep sensing the light brightness in the rooms.
### class [`BrightnessSensingIntention`](src/myhouse/BrightnessSensing.js)
Implementation of the goal `BrightnessSensingGoal`.

### class [`LightControlGoal`](src/myhouse/Light.js)
Goal: control the main lights of each room: the light is turned on when 
there is not enough sunlight and there is someone in the room.
### class [`LightControlIntention`](src/myhouse/Light.js)
Implementation of the goal `LightControlGoal`.

### class [`ShutterControlGoal`](src/myhouse/Shutter.js)
Goal: control the shutters of each room: each shutter should go up at 7.00 AM and
go down at 9.00 PM.
### class [`ShutterControlIntention`](src/myhouse/Shutter.js)
Implementation of the goal `ShutterControlGoal`.

### class [`GarageDoorControlGoal`](src/myhouse/GarageDoor.js)
Goal: control the garage door: close it at 9.00 PM if open.
### class [`GarageDoorControlIntention`](src/myhouse/GarageDoor.js)
Implementation of the goal `GarageDoorControlGoal`.

### class [`TelevisionControlGoal`](src/myhouse/Television.js)
Goal: control the TV and the lights near the TV: turn on the TV in the morning and after dinner.
### class [`TelevisionControlIntention`](src/myhouse/Television.js)
Implementation of the goal `TelevisionControlGoal`.

### class [`SolarPanelMonitorGoal`](src/myhouse/SolarPanel.js)
Goal: monitor the solar panel status.
### class [`TelevisionControlIntention`](src/myhouse/SolarPanel.js)
Implementation of the goal `SolarPanelMonitorGoal`.

### class [`EnergyMonitorGoal`](src/myhouse/ResourceMonitor.js)
Goal: monitor the energy consumption and production.
### class [`EnergyMonitorIntention`](src/myhouse/ResourceMonitor.js)
Implementation of the goal `EnergyMonitorGoal`.


# Changelog
- [src/utils/Observable.js](src/utils/Observable.js):
add an id to each observer to be able to have many observers for each key.
- [src/utils/Clock.js](src/utils/Clock.js):
implementation of the methods `getTime()` and `getIncrement()` that permit to obtain a copy of the current time and the time increment of the clock at each time step.
- [src/bdi/Beliefset.js](src/bdi/Beliefset.js):
implementation of the method `matchingLiterals(literal_pattern)` that permits to obtain the literals matching the pattern.