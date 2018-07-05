const {
    Proteus,
    BrokerInfoServiceClient,
    Broker, Group, Destination, Event, Empty
} = require('proteus-js-client');

const {
    encodeProteusMetadata
} = require('proteus-js-frames');

const {
    Flowable,
    Single
} = require('rsocket-flowable');



/** Helpers **/

// For generating variable identities in order to easily tell if messages are coming from this application instance or another
const alphabet = [
    "Alfa", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima", "Mike", "November",
    "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-Ray", "Yankee", "Zulu"
];

const numbers = [
    "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"
];

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function generateName(){
    return alphabet[getRandomInt(25)] + '-' + numbers[getRandomInt(9)] + '-' + numbers[getRandomInt(9)] + '-' + numbers[getRandomInt(9)];
}

// Convenience method to update the webpage as new messages are available
function addMessage(message, element) {
    var ul = document.getElementById(element);
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(message));
    if(ul.childElementCount >= 10){
        ul.removeChild(ul.childNodes[0]);
    }
    ul.appendChild(li);
}

function clearMessages(element){
    var ul = document.getElementById(element);
    if(ul.childElementCount > 0){
        ul.removeChild(ul.childNodes[0]);
    }
}

function main() {
    const url = __WS_URL__;

    const sessionId = generateName();
    addMessage(sessionId, 'destination');

    // This Proteus object acts as our gateway to both send messages to services and to register services that we support
    const proteus = Proteus.create({
        setup: {
            group: 'browser-explorer',
            destination: sessionId,
            accessKey: 9007199254740991,
            accessToken: 'kTBDVtfRBO4tHOnZzSyY5ym2kfY=',
        },
        transport: {
            url,
        },
    });

    // This section is how one would query information about available brokers. The BrokerInfoService client is packaged
    // with the proteus client library and has several query functions to find the status of active brokers and services
    const brokerInfoService = new BrokerInfoServiceClient(
        proteus.group('com.netifi.proteus.brokerServices'),
    );


    let _brokersSubscription;
    let _groupsSubscription;
    let _destinationsSubscription;

    setInterval(() => {
        console.log("Checking destinations status...");
        clearMessages('messages');
        if(_brokersSubscription){
            console.log("canceling broker subscription:");
            _brokersSubscription.cancel();
        }
        if(_groupsSubscription){
            console.log("canceling group subscription:");
            _groupsSubscription.cancel();
        }
        if(_destinationsSubscription){
            console.log("canceling destination subscription:");
            _destinationsSubscription.cancel();
        }

        brokerInfoService.brokers(new Empty(), Buffer.alloc(0)).subscribe({
            onComplete: () => console.log('brokers complete'),
            onError: error => console.error(error),
            onNext: broker => {
                console.log("Checking groups for " + JSON.stringify(broker.toObject()));
                brokerInfoService.groups(broker, Buffer.alloc(0)).subscribe({
                    onComplete: () => {
                        console.log('groups complete');
                    },
                    onError: error => console.error(error),
                    onNext: group => {
                        console.log("Checking destinations for" + JSON.stringify(group.toObject()));
                        brokerInfoService.destinationsByBrokerAndGroup(group, Buffer.alloc(0)).subscribe({
                            onComplete: () => {
                                console.log('destinations complete');
                            },
                            onError: error => console.error(error),
                            onNext: destination => {
                                let pretty = JSON.stringify(destination.toObject());
                                console.log(pretty);
                                addMessage(pretty, 'messages');
                                _destinationsSubscription.request(1);
                            },
                            onSubscribe: subscription => {
                                console.log("created destination subscription: " + JSON.stringify(subscription));
                                _destinationsSubscription = subscription;
                                _destinationsSubscription.request(1);
                            },
                        })
                        _groupsSubscription.request(1);
                    },
                    onSubscribe: subscription => {
                        console.log("created groups subscription: " + JSON.stringify(subscription));
                        _groupsSubscription = subscription;
                        _groupsSubscription.request(1);
                    },
                });
                _brokersSubscription.request(1);
            },
            onSubscribe: subscription => {
                console.log("created broker subscription: " + JSON.stringify(subscription));
                _brokersSubscription = subscription;
                _brokersSubscription.request(1);
            },
        });

    }, 15000);
}

document.addEventListener('DOMContentLoaded', main);
