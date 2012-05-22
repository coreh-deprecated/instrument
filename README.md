## Node Instrument

Instrument node.js code for async profiling.

    var instrument = require('instrument')
    var fs = require('fs')

    instrument('fs')
    
    instrument.listen(9001)