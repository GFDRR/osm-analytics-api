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
        sshagent (credentials: ['osma_staging']) {
          sh 'ssh ubuntu@${OSMA_STAGING}" cd /home/ubuntu/projects/osm-analytics-api && ./start.sh"'
        }
      } else {

      }
      mail bcc: '', body: 'Project  ${JOB_NAME} build success is here: ${env.BUILD_URL}', cc: '', from: '', replyTo: '', subject: 'Project osm build success', to: 'raul.requero@vizzuality.com'

    }

  } catch (err) {

    currentBuild.result = "FAILURE"
    mail bcc: '', body: 'Project ${JOB_NAME} build error is here: ${env.BUILD_URL}', cc: '', from: '', replyTo: '', subject: 'Project osm build failed', to: 'raul.requero@vizzuality.com'

    throw err
  }

}
