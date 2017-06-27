#!groovy

/**

  Example pipeline to deploy this application. Will behave differently depending on the branch it is run on.
  For an alternative example, see
  https://github.com/GoogleCloudPlatform/continuous-deployment-on-kubernetes/blob/master/sample-app/Jenkinsfile

*/
node {

  currentBuild.result = "SUCCESS"
  // checkout sources
  checkout scm

  try {


    stage('Deploy') {

      if (env.BRANCH_NAME == "develop") {
        // alternative deployment pipeline for production
        sshagent (credentials: ['osma_staging']) {
          sh 'ssh -o StrictHostKeyChecking=no ubuntu@${OSMA_STAGING} "cd /home/ubuntu/projects/osm-analytics-api && ./start.sh"'
        }
      } else {

      }

    }

  } catch (err) {

    currentBuild.result = "FAILURE"
    // mail body: "project build error is here: ${env.BUILD_URL}" ,
    // from: 'xxxx@yyyy.com',
    // replyTo: 'yyyy@yyyy.com',
    // subject: 'project build failed',
    // to: 'zzzz@yyyyy.com'

    throw err
  }

}
