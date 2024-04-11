sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'ns/eventmesh/test/integration/FirstJourney',
		'ns/eventmesh/test/integration/pages/RisksList',
		'ns/eventmesh/test/integration/pages/RisksObjectPage'
    ],
    function(JourneyRunner, opaJourney, RisksList, RisksObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('ns/eventmesh') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheRisksList: RisksList,
					onTheRisksObjectPage: RisksObjectPage
                }
            },
            opaJourney.run
        );
    }
);